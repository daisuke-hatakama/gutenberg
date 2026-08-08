/**
 * External dependencies
 */
import type { Awareness } from 'y-protocols/awareness';

/**
 * Internal dependencies
 */
import type { EngineSessionCodec } from './session';
import type {
	ObjectData,
	ObjectID,
	ObjectType,
	RecordHandlers,
	SyncConfig,
	SyncManagerUpdateOptions,
	SyncUndoManager,
} from '../types';

/**
 * Callbacks the generic manager hands an engine entity so remote-driven
 * changes flow back into the editor without the manager knowing the engine's
 * document model.
 */
export interface EngineEntityObservers {
	/**
	 * A remote- or undo-driven document change landed; the manager should pull
	 * the resulting changes into the editor record.
	 */
	onRemoteChange: () => void;
	/**
	 * A peer performed a user-facing save; the manager should refetch the
	 * record so this cache sees server-side save mutations.
	 */
	onPeerSave: () => void;
}

/**
 * One engine's document core for a single entity (room). It owns the MEANING
 * of sync for that entity — how local edits become updates, how received
 * updates become editor changes, and its snapshot/undo semantics — while the
 * generic sync manager owns everything AROUND it: negotiation, provider
 * wiring, lifecycle, and the deferred-update policy.
 *
 * The Yjs relay implements this over a `Y.Doc`; the intent-log engine (in the
 * Gutenberg Sync Engines plugin) implements it over its document + rebase
 * model. The manager treats both identically.
 */
export interface EngineEntity {
	/** Awareness for this entity, if the engine's sync config created one. */
	readonly awareness?: Awareness;

	/**
	 * Mints a transport-facing session codec over this entity's state. Called
	 * once per provider, so each transport drives its own codec instance over
	 * the shared document.
	 */
	createSession: () => EngineSessionCodec;

	/**
	 * Seeds the document from the persisted record (initializing it when there
	 * is nothing persisted). `persist` requests that the (re)initialized
	 * document be persisted with the entity.
	 */
	hydrate: ( record: ObjectData, persist: () => void ) => void;

	/** Folds local editor changes into the document. */
	applyLocalChanges: (
		changes: Partial< ObjectData >,
		origin: string,
		options: SyncManagerUpdateOptions
	) => void;

	/**
	 * Computes the editor-facing changes for the current document state versus
	 * the given edited record (drives `editRecord`).
	 */
	getEditorChanges: ( editedRecord: ObjectData ) => Partial< ObjectData >;

	/** Encodes a content-free snapshot of the current document. */
	encodeSnapshot: () => string;

	/** Whether the document contains everything the encoded snapshot describes. */
	containsSnapshot: ( encoded: string ) => boolean;

	/** Serializes the document for persistence with the entity. */
	serialize: () => string;

	/**
	 * Attaches remote-change / peer-save observation. Called once, after the
	 * document is hydrated.
	 */
	observe: ( observers: EngineEntityObservers ) => void;

	/** Registers the document with the sync-aware undo manager. */
	addToUndoScope: (
		undoManager: SyncUndoManager,
		meta: Pick<
			RecordHandlers,
			'addUndoMeta' | 'restoreUndoMeta' | 'onUndoStackChange'
		>
	) => void;

	/** Detaches observers and destroys the underlying document. */
	destroy: () => void;
}

/**
 * A session-scoped sync engine: its identity plus a factory of per-entity
 * cores. The generic manager is constructed with one resolved engine (the one
 * the server announced) and asks it for an {@link EngineEntity} per room.
 */
export interface SyncEngine {
	readonly slug: string;
	readonly protocolVersion: number;
	createEntity: ( context: {
		syncConfig: SyncConfig;
		objectType: ObjectType;
		objectId: ObjectID;
	} ) => EngineEntity;
}
