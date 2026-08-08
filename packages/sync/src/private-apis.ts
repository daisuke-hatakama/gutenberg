/**
 * Internal dependencies
 */
import {
	CRDT_DOC_META_PERSISTENCE_KEY,
	CRDT_RECORD_MAP_KEY,
	LOCAL_EDITOR_ORIGIN,
	LOCAL_UNDO_IGNORED_ORIGIN,
} from './config';
import { ConnectionError, ConnectionErrorCode } from './errors';
import {
	getEngineAdapters,
	registerSyncEngine,
	resetEngineAdaptersForTesting,
	resolveEngineAdapter,
} from './engines';
import {
	getProviderCreators,
	registerSyncTransport,
	resetProviderCreatorsForTesting,
} from './providers';
import { lock } from './lock-unlock';
import { createSyncManager } from './manager';
import { pollingManager } from './providers/http-polling/polling-manager';
import { default as Delta } from './quill-delta/Delta';

export const privateApis = {};

lock( privateApis, {
	ConnectionErrorCode,
	/**
	 * @deprecated Resolve the manager through `resolveEngineAdapter()` so the
	 *             server-announced engine handshake is honored; direct
	 *             construction bypasses the engine mismatch check.
	 */
	createSyncManager,
	resolveEngineAdapter,
	// The engines plugin registers its adapters and transports through
	// these, and drives its managers/providers through the shared registry
	// + error type (see the Gutenberg Sync Engines plugin).
	registerSyncEngine,
	registerSyncTransport,
	getProviderCreators,
	ConnectionError,
	// Test-support: engine/transport plugins reset the shared registries and
	// assert registration state between their own unit tests.
	getEngineAdapters,
	resetEngineAdaptersForTesting,
	resetProviderCreatorsForTesting,
	Delta,
	CRDT_DOC_META_PERSISTENCE_KEY,
	CRDT_RECORD_MAP_KEY,
	LOCAL_EDITOR_ORIGIN,
	LOCAL_UNDO_IGNORED_ORIGIN,
	retrySyncConnection: () => pollingManager.retryNow(),
} );
