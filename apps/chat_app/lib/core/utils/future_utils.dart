import 'dart:async';

/// Future utilities for advanced async operations
class FutureUtils {
  FutureUtils._();

  /// Execute futures in parallel with concurrency limit
  static Future<List<T>> parallelLimit<T>(
    Iterable<Future<T> Function()> tasks, {
    int concurrency = 3,
  }) async {
    final results = <T>[];
    final taskList = tasks.toList();
    var currentIndex = 0;
    final completer = Completer<List<T>>();
    var activeCount = 0;
    var hasError = false;

    Future<void> runNext() async {
      if (hasError || currentIndex >= taskList.length) return;

      final index = currentIndex++;
      activeCount++;

      try {
        results.add(await taskList[index]());
      } catch (e) {
        hasError = true;
        completer.completeError(e);
        return;
      }

      activeCount--;

      if (currentIndex < taskList.length) {
        runNext();
      } else if (activeCount == 0 && !completer.isCompleted) {
        completer.complete(results);
      }
    }

    // Start initial batch
    final initialBatch = taskList.length < concurrency
        ? taskList.length
        : concurrency;

    for (var i = 0; i < initialBatch; i++) {
      runNext();
    }

    if (taskList.isEmpty) {
      return [];
    }

    return completer.future;
  }

  /// Execute futures sequentially
  static Future<List<T>> sequential<T>(
    Iterable<Future<T> Function()> tasks,
  ) async {
    final results = <T>[];
    for (final task in tasks) {
      results.add(await task());
    }
    return results;
  }

  /// Race multiple futures, return first to complete
  static Future<T> race<T>(Iterable<Future<T>> futures) {
    final completer = Completer<T>();

    for (final future in futures) {
      future.then((value) {
        if (!completer.isCompleted) {
          completer.complete(value);
        }
      }).catchError((error) {
        if (!completer.isCompleted) {
          completer.completeError(error);
        }
      });
    }

    return completer.future;
  }

  /// Wait for all futures, collecting results and errors
  static Future<(List<T> successes, List<Object> errors)> settle<T>(
    Iterable<Future<T>> futures,
  ) async {
    final successes = <T>[];
    final errors = <Object>[];

    await Future.wait(
      futures.map((future) async {
        try {
          successes.add(await future);
        } catch (e) {
          errors.add(e);
        }
      }),
    );

    return (successes, errors);
  }

  /// Create a delayed future
  static Future<T> delay<T>(Duration duration, T Function() compute) async {
    await Future.delayed(duration);
    return compute();
  }

  /// Create a future that times out
  static Future<T> withTimeout<T>(
    Future<T> future,
    Duration timeout, {
    T Function()? onTimeout,
  }) {
    return future.timeout(
      timeout,
      onTimeout: onTimeout,
    );
  }

  /// Polling until condition is met
  static Future<T> poll<T>({
    required Future<T> Function() fn,
    required bool Function(T result) until,
    Duration interval = const Duration(seconds: 1),
    Duration? timeout,
  }) async {
    final stopwatch = timeout != null ? (Stopwatch()..start()) : null;

    while (true) {
      final result = await fn();
      if (until(result)) {
        return result;
      }

      if (stopwatch != null && stopwatch.elapsed >= timeout!) {
        throw TimeoutException('Polling timed out', timeout);
      }

      await Future.delayed(interval);
    }
  }
}

/// Future extensions
extension FutureExtensions<T> on Future<T> {
  /// Retry future on failure
  Future<T> retry({
    int maxAttempts = 3,
    Duration delay = const Duration(seconds: 1),
    bool exponentialBackoff = false,
    bool Function(Object error)? retryIf,
  }) async {
    var attempts = 0;
    var currentDelay = delay;

    while (true) {
      try {
        attempts++;
        return await this;
      } catch (e) {
        if (attempts >= maxAttempts) rethrow;
        if (retryIf != null && !retryIf(e)) rethrow;

        await Future.delayed(currentDelay);

        if (exponentialBackoff) {
          currentDelay *= 2;
        }
      }
    }
  }

  /// Add timeout to future
  Future<T> withTimeout(
    Duration timeout, {
    T Function()? onTimeout,
  }) {
    return this.timeout(timeout, onTimeout: onTimeout);
  }

  /// Execute callback regardless of result
  Future<T> whenComplete(FutureOr<void> Function() action) {
    return then(
      (value) async {
        await action();
        return value;
      },
      onError: (error, stackTrace) async {
        await action();
        throw error;
      },
    );
  }

  /// Map future value
  Future<R> mapTo<R>(R Function(T value) transform) {
    return then(transform);
  }

  /// Tap into future value without modifying
  Future<T> tap(void Function(T value) action) {
    return then((value) {
      action(value);
      return value;
    });
  }

  /// Recover from error with value
  Future<T> recover(T Function(Object error) recovery) {
    return catchError((error) => recovery(error));
  }

  /// Recover from specific error type
  Future<T> recoverWith<E>(T Function(E error) recovery) {
    return catchError(
      (error) => recovery(error as E),
      test: (error) => error is E,
    );
  }

  /// Convert to nullable on error
  Future<T?> orNull() {
    return then<T?>((value) => value).catchError((_) => null);
  }

  /// Get value or default on error
  Future<T> getOrElse(T defaultValue) {
    return catchError((_) => defaultValue);
  }

  /// Pair with another future
  Future<(T, R)> zipWith<R>(Future<R> other) async {
    final results = await Future.wait([this, other]);
    return (results[0] as T, results[1] as R);
  }
}

/// Retry configuration
class RetryConfig {
  final int maxAttempts;
  final Duration initialDelay;
  final bool exponentialBackoff;
  final double backoffMultiplier;
  final Duration maxDelay;
  final bool Function(Object error)? retryIf;

  const RetryConfig({
    this.maxAttempts = 3,
    this.initialDelay = const Duration(seconds: 1),
    this.exponentialBackoff = true,
    this.backoffMultiplier = 2.0,
    this.maxDelay = const Duration(seconds: 30),
    this.retryIf,
  });

  Duration getDelay(int attempt) {
    if (!exponentialBackoff) return initialDelay;

    var delay = initialDelay;
    for (var i = 1; i < attempt; i++) {
      delay *= backoffMultiplier.toInt();
      if (delay > maxDelay) return maxDelay;
    }
    return delay;
  }
}

/// Retry helper with configuration
Future<T> retryAsync<T>(
  Future<T> Function() fn, {
  RetryConfig config = const RetryConfig(),
}) async {
  var attempts = 0;

  while (true) {
    try {
      attempts++;
      return await fn();
    } catch (e) {
      if (attempts >= config.maxAttempts) rethrow;
      if (config.retryIf != null && !config.retryIf!(e)) rethrow;

      await Future.delayed(config.getDelay(attempts));
    }
  }
}

/// Debouncer for function calls
class Debouncer {
  final Duration delay;
  Timer? _timer;

  Debouncer({required this.delay});

  void run(void Function() action) {
    _timer?.cancel();
    _timer = Timer(delay, action);
  }

  Future<T> runAsync<T>(Future<T> Function() action) {
    final completer = Completer<T>();
    _timer?.cancel();
    _timer = Timer(delay, () async {
      try {
        completer.complete(await action());
      } catch (e, st) {
        completer.completeError(e, st);
      }
    });
    return completer.future;
  }

  void cancel() {
    _timer?.cancel();
    _timer = null;
  }

  bool get isActive => _timer?.isActive ?? false;
}

/// Throttler for function calls
class Throttler {
  final Duration interval;
  DateTime? _lastExecution;
  Timer? _timer;

  Throttler({required this.interval});

  void run(void Function() action) {
    final now = DateTime.now();

    if (_lastExecution == null ||
        now.difference(_lastExecution!) >= interval) {
      _lastExecution = now;
      action();
    }
  }

  void runWithTrailing(void Function() action) {
    final now = DateTime.now();

    if (_lastExecution == null ||
        now.difference(_lastExecution!) >= interval) {
      _lastExecution = now;
      action();
    } else {
      _timer?.cancel();
      _timer = Timer(
        interval - now.difference(_lastExecution!),
        () {
          _lastExecution = DateTime.now();
          action();
        },
      );
    }
  }

  void cancel() {
    _timer?.cancel();
    _timer = null;
  }
}

/// Cancelable operation
class CancelableOperation<T> {
  final Completer<T> _completer = Completer<T>();
  bool _isCanceled = false;

  CancelableOperation(Future<T> Function() operation) {
    _run(operation);
  }

  Future<void> _run(Future<T> Function() operation) async {
    try {
      final result = await operation();
      if (!_isCanceled && !_completer.isCompleted) {
        _completer.complete(result);
      }
    } catch (e, st) {
      if (!_isCanceled && !_completer.isCompleted) {
        _completer.completeError(e, st);
      }
    }
  }

  Future<T> get value => _completer.future;
  bool get isCanceled => _isCanceled;
  bool get isCompleted => _completer.isCompleted;

  void cancel() {
    _isCanceled = true;
    if (!_completer.isCompleted) {
      _completer.completeError(CancellationException());
    }
  }
}

class CancellationException implements Exception {
  final String message;
  CancellationException([this.message = 'Operation was canceled']);

  @override
  String toString() => 'CancellationException: $message';
}

/// Lazy future that computes only when accessed
class LazyFuture<T> {
  final Future<T> Function() _compute;
  Future<T>? _future;

  LazyFuture(this._compute);

  Future<T> get value => _future ??= _compute();

  bool get isComputed => _future != null;

  void reset() => _future = null;
}
