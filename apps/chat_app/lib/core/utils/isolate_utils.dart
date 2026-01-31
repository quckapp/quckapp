import 'dart:async';
import 'dart:isolate';

/// Isolate utilities for heavy computation

/// Run computation in separate isolate
Future<R> compute<T, R>(
  R Function(T message) callback,
  T message,
) async {
  final receivePort = ReceivePort();
  final errorPort = ReceivePort();

  await Isolate.spawn<_IsolateMessage<T, R>>(
    _isolateEntry,
    _IsolateMessage(callback, message, receivePort.sendPort),
    onError: errorPort.sendPort,
  );

  final completer = Completer<R>();

  errorPort.listen((error) {
    if (!completer.isCompleted) {
      completer.completeError(error[0], StackTrace.fromString(error[1]));
    }
  });

  receivePort.listen((result) {
    if (!completer.isCompleted) {
      completer.complete(result as R);
    }
  });

  try {
    return await completer.future;
  } finally {
    receivePort.close();
    errorPort.close();
  }
}

void _isolateEntry<T, R>(_IsolateMessage<T, R> message) {
  final result = message.callback(message.data);
  message.sendPort.send(result);
}

class _IsolateMessage<T, R> {
  final R Function(T) callback;
  final T data;
  final SendPort sendPort;

  _IsolateMessage(this.callback, this.data, this.sendPort);
}

/// Run computation with progress updates
Future<R> computeWithProgress<T, R, P>({
  required R Function(T message, void Function(P) onProgress) callback,
  required T message,
  required void Function(P progress) onProgress,
}) async {
  final resultPort = ReceivePort();
  final progressPort = ReceivePort();

  progressPort.listen((progress) {
    onProgress(progress as P);
  });

  await Isolate.spawn<_ProgressIsolateMessage<T, R, P>>(
    _progressIsolateEntry,
    _ProgressIsolateMessage(
      callback,
      message,
      resultPort.sendPort,
      progressPort.sendPort,
    ),
  );

  try {
    final result = await resultPort.first;
    return result as R;
  } finally {
    resultPort.close();
    progressPort.close();
  }
}

void _progressIsolateEntry<T, R, P>(_ProgressIsolateMessage<T, R, P> message) {
  final result = message.callback(
    message.data,
    (progress) => message.progressPort.send(progress),
  );
  message.resultPort.send(result);
}

class _ProgressIsolateMessage<T, R, P> {
  final R Function(T, void Function(P)) callback;
  final T data;
  final SendPort resultPort;
  final SendPort progressPort;

  _ProgressIsolateMessage(
    this.callback,
    this.data,
    this.resultPort,
    this.progressPort,
  );
}

/// Isolate pool for reusing isolates
class IsolatePool {
  final int size;
  final List<_PooledIsolate> _isolates = [];
  final List<Completer<_PooledIsolate>> _waitQueue = [];
  bool _isDisposed = false;

  IsolatePool({this.size = 4});

  Future<void> _ensureInitialized() async {
    if (_isolates.length < size) {
      for (var i = _isolates.length; i < size; i++) {
        _isolates.add(await _PooledIsolate.spawn());
      }
    }
  }

  Future<R> run<T, R>(R Function(T) callback, T message) async {
    if (_isDisposed) {
      throw StateError('IsolatePool has been disposed');
    }

    await _ensureInitialized();

    // Find available isolate
    final available = _isolates.where((i) => !i.isBusy).firstOrNull;

    if (available != null) {
      return await available.run(callback, message);
    }

    // Wait for available isolate
    final completer = Completer<_PooledIsolate>();
    _waitQueue.add(completer);
    final isolate = await completer.future;
    return await isolate.run(callback, message);
  }

  Future<void> dispose() async {
    _isDisposed = true;
    for (final isolate in _isolates) {
      isolate.dispose();
    }
    _isolates.clear();

    for (final completer in _waitQueue) {
      completer.completeError(StateError('Pool disposed'));
    }
    _waitQueue.clear();
  }
}

class _PooledIsolate {
  final Isolate isolate;
  final SendPort sendPort;
  final ReceivePort receivePort;
  bool _isBusy = false;

  bool get isBusy => _isBusy;

  _PooledIsolate._(this.isolate, this.sendPort, this.receivePort);

  static Future<_PooledIsolate> spawn() async {
    final receivePort = ReceivePort();
    final isolate = await Isolate.spawn(_pooledIsolateEntry, receivePort.sendPort);
    final sendPort = await receivePort.first as SendPort;
    return _PooledIsolate._(isolate, sendPort, receivePort);
  }

  Future<R> run<T, R>(R Function(T) callback, T message) async {
    _isBusy = true;
    try {
      final responsePort = ReceivePort();
      sendPort.send(_PooledTask(callback, message, responsePort.sendPort));
      final result = await responsePort.first;
      responsePort.close();
      return result as R;
    } finally {
      _isBusy = false;
    }
  }

  void dispose() {
    isolate.kill(priority: Isolate.immediate);
    receivePort.close();
  }
}

void _pooledIsolateEntry(SendPort sendPort) {
  final receivePort = ReceivePort();
  sendPort.send(receivePort.sendPort);

  receivePort.listen((message) {
    if (message is _PooledTask) {
      final result = message.callback(message.data);
      message.responsePort.send(result);
    }
  });
}

class _PooledTask<T, R> {
  final R Function(T) callback;
  final T data;
  final SendPort responsePort;

  _PooledTask(this.callback, this.data, this.responsePort);
}

/// Parallel map using isolates
Future<List<R>> parallelMap<T, R>(
  List<T> items,
  R Function(T) transform, {
  int? concurrency,
}) async {
  final pool = IsolatePool(size: concurrency ?? 4);

  try {
    final futures = items.map((item) => pool.run(transform, item));
    return await Future.wait(futures);
  } finally {
    await pool.dispose();
  }
}

/// Chunked parallel processing
Future<List<R>> chunkedParallelMap<T, R>(
  List<T> items,
  R Function(T) transform, {
  int chunkSize = 100,
  int? concurrency,
}) async {
  final chunks = <List<T>>[];
  for (var i = 0; i < items.length; i += chunkSize) {
    chunks.add(items.sublist(i, (i + chunkSize).clamp(0, items.length)));
  }

  List<R> processChunk(List<T> chunk) {
    return chunk.map(transform).toList();
  }

  final pool = IsolatePool(size: concurrency ?? 4);

  try {
    final resultChunks = await Future.wait(
      chunks.map((chunk) => pool.run(processChunk, chunk)),
    );
    return resultChunks.expand((chunk) => chunk).toList();
  } finally {
    await pool.dispose();
  }
}

/// Background worker for long-running tasks
class BackgroundWorker<T, R> {
  final R Function(T) _processor;
  Isolate? _isolate;
  SendPort? _sendPort;
  ReceivePort? _receivePort;
  final _pending = <int, Completer<R>>{};
  int _messageId = 0;
  bool _isDisposed = false;

  BackgroundWorker(this._processor);

  Future<void> start() async {
    if (_isolate != null) return;

    _receivePort = ReceivePort();
    _isolate = await Isolate.spawn(
      _workerEntry,
      _WorkerInit(_processor, _receivePort!.sendPort),
    );

    _sendPort = await _receivePort!.first as SendPort;

    _receivePort!.listen((message) {
      if (message is _WorkerResponse) {
        final completer = _pending.remove(message.id);
        if (message.error != null) {
          completer?.completeError(message.error!);
        } else {
          completer?.complete(message.result as R);
        }
      }
    });
  }

  Future<R> process(T input) async {
    if (_isDisposed) throw StateError('Worker has been disposed');
    if (_sendPort == null) await start();

    final id = _messageId++;
    final completer = Completer<R>();
    _pending[id] = completer;

    _sendPort!.send(_WorkerMessage(id, input));

    return completer.future;
  }

  void dispose() {
    _isDisposed = true;
    _isolate?.kill(priority: Isolate.immediate);
    _receivePort?.close();

    for (final completer in _pending.values) {
      completer.completeError(StateError('Worker disposed'));
    }
    _pending.clear();
  }
}

void _workerEntry<T, R>(_WorkerInit<T, R> init) {
  final receivePort = ReceivePort();
  init.sendPort.send(receivePort.sendPort);

  receivePort.listen((message) {
    if (message is _WorkerMessage<T>) {
      try {
        final result = init.processor(message.data);
        init.sendPort.send(_WorkerResponse(message.id, result, null));
      } catch (e) {
        init.sendPort.send(_WorkerResponse(message.id, null, e));
      }
    }
  });
}

class _WorkerInit<T, R> {
  final R Function(T) processor;
  final SendPort sendPort;
  _WorkerInit(this.processor, this.sendPort);
}

class _WorkerMessage<T> {
  final int id;
  final T data;
  _WorkerMessage(this.id, this.data);
}

class _WorkerResponse<R> {
  final int id;
  final R? result;
  final Object? error;
  _WorkerResponse(this.id, this.result, this.error);
}
