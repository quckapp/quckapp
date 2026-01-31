import 'dart:async';

/// Stream utilities and transformers
class StreamUtils {
  StreamUtils._();

  /// Create a stream that emits values at intervals
  static Stream<int> interval(Duration duration, {int? count}) async* {
    var i = 0;
    while (count == null || i < count) {
      await Future.delayed(duration);
      yield i++;
    }
  }

  /// Create a stream from multiple futures
  static Stream<T> fromFutures<T>(Iterable<Future<T>> futures) async* {
    for (final future in futures) {
      yield await future;
    }
  }

  /// Merge multiple streams into one
  static Stream<T> merge<T>(Iterable<Stream<T>> streams) {
    final controller = StreamController<T>.broadcast();
    final subscriptions = <StreamSubscription<T>>[];
    var activeStreams = streams.length;

    for (final stream in streams) {
      subscriptions.add(
        stream.listen(
          controller.add,
          onError: controller.addError,
          onDone: () {
            activeStreams--;
            if (activeStreams == 0) {
              controller.close();
            }
          },
        ),
      );
    }

    controller.onCancel = () {
      for (final sub in subscriptions) {
        sub.cancel();
      }
    };

    return controller.stream;
  }

  /// Combine latest values from multiple streams
  static Stream<List<T>> combineLatest<T>(List<Stream<T>> streams) {
    final controller = StreamController<List<T>>.broadcast();
    final values = List<T?>.filled(streams.length, null);
    final hasValue = List<bool>.filled(streams.length, false);
    final subscriptions = <StreamSubscription<T>>[];
    var activeStreams = streams.length;

    void emitIfReady() {
      if (hasValue.every((v) => v)) {
        controller.add(List<T>.from(values.cast<T>()));
      }
    }

    for (var i = 0; i < streams.length; i++) {
      final index = i;
      subscriptions.add(
        streams[i].listen(
          (value) {
            values[index] = value;
            hasValue[index] = true;
            emitIfReady();
          },
          onError: controller.addError,
          onDone: () {
            activeStreams--;
            if (activeStreams == 0) {
              controller.close();
            }
          },
        ),
      );
    }

    controller.onCancel = () {
      for (final sub in subscriptions) {
        sub.cancel();
      }
    };

    return controller.stream;
  }

  /// Zip streams together
  static Stream<(T1, T2)> zip2<T1, T2>(Stream<T1> s1, Stream<T2> s2) async* {
    final queue1 = <T1>[];
    final queue2 = <T2>[];
    final completer = Completer<void>();

    var done1 = false;
    var done2 = false;

    s1.listen(
      (v) => queue1.add(v),
      onDone: () => done1 = true,
    );

    s2.listen(
      (v) => queue2.add(v),
      onDone: () {
        done2 = true;
        if (!completer.isCompleted) completer.complete();
      },
    );

    while (true) {
      if (queue1.isNotEmpty && queue2.isNotEmpty) {
        yield (queue1.removeAt(0), queue2.removeAt(0));
      } else if (done1 || done2) {
        break;
      } else {
        await Future.delayed(const Duration(milliseconds: 10));
      }
    }
  }
}

/// Stream transformer extensions
extension StreamExtensions<T> on Stream<T> {
  /// Debounce stream events
  Stream<T> debounce(Duration duration) {
    Timer? timer;
    T? lastValue;
    final controller = StreamController<T>.broadcast();

    listen(
      (value) {
        lastValue = value;
        timer?.cancel();
        timer = Timer(duration, () {
          if (lastValue != null) {
            controller.add(lastValue as T);
          }
        });
      },
      onError: controller.addError,
      onDone: () {
        timer?.cancel();
        controller.close();
      },
    );

    return controller.stream;
  }

  /// Throttle stream events
  Stream<T> throttle(Duration duration) {
    DateTime? lastEmit;
    final controller = StreamController<T>.broadcast();

    listen(
      (value) {
        final now = DateTime.now();
        if (lastEmit == null || now.difference(lastEmit!) >= duration) {
          lastEmit = now;
          controller.add(value);
        }
      },
      onError: controller.addError,
      onDone: controller.close,
    );

    return controller.stream;
  }

  /// Throttle with trailing emission
  Stream<T> throttleWithTrailing(Duration duration) {
    Timer? timer;
    T? lastValue;
    bool hasValue = false;
    final controller = StreamController<T>.broadcast();

    listen(
      (value) {
        lastValue = value;
        hasValue = true;

        if (timer == null || !timer!.isActive) {
          controller.add(value);
          hasValue = false;

          timer = Timer(duration, () {
            if (hasValue) {
              controller.add(lastValue as T);
              hasValue = false;
            }
          });
        }
      },
      onError: controller.addError,
      onDone: () {
        timer?.cancel();
        controller.close();
      },
    );

    return controller.stream;
  }

  /// Buffer events until duration passes
  Stream<List<T>> buffer(Duration duration) {
    final controller = StreamController<List<T>>.broadcast();
    var buffer = <T>[];

    Timer.periodic(duration, (_) {
      if (buffer.isNotEmpty) {
        controller.add(List.from(buffer));
        buffer = [];
      }
    });

    listen(
      (value) => buffer.add(value),
      onError: controller.addError,
      onDone: () {
        if (buffer.isNotEmpty) {
          controller.add(buffer);
        }
        controller.close();
      },
    );

    return controller.stream;
  }

  /// Buffer events by count
  Stream<List<T>> bufferCount(int count) {
    final controller = StreamController<List<T>>.broadcast();
    var buffer = <T>[];

    listen(
      (value) {
        buffer.add(value);
        if (buffer.length >= count) {
          controller.add(List.from(buffer));
          buffer = [];
        }
      },
      onError: controller.addError,
      onDone: () {
        if (buffer.isNotEmpty) {
          controller.add(buffer);
        }
        controller.close();
      },
    );

    return controller.stream;
  }

  /// Distinct consecutive values
  Stream<T> distinctConsecutive([bool Function(T prev, T curr)? equals]) {
    T? previous;
    bool hasPrevious = false;
    final eq = equals ?? (a, b) => a == b;

    return where((value) {
      if (!hasPrevious) {
        hasPrevious = true;
        previous = value;
        return true;
      }
      if (!eq(previous as T, value)) {
        previous = value;
        return true;
      }
      return false;
    });
  }

  /// Take until another stream emits
  Stream<T> takeUntil(Stream<void> notifier) {
    final controller = StreamController<T>.broadcast();
    late StreamSubscription<T> subscription;
    late StreamSubscription<void> notifierSubscription;

    subscription = listen(
      controller.add,
      onError: controller.addError,
      onDone: () {
        notifierSubscription.cancel();
        controller.close();
      },
    );

    notifierSubscription = notifier.listen(
      (_) {
        subscription.cancel();
        controller.close();
      },
    );

    return controller.stream;
  }

  /// Skip until condition is met
  Stream<T> skipUntil(bool Function(T value) condition) {
    bool conditionMet = false;

    return where((value) {
      if (conditionMet) return true;
      if (condition(value)) {
        conditionMet = true;
        return true;
      }
      return false;
    });
  }

  /// Map with index
  Stream<R> mapIndexed<R>(R Function(int index, T value) transform) {
    var index = 0;
    return map((value) => transform(index++, value));
  }

  /// Pairwise consecutive elements
  Stream<(T, T)> pairwise() async* {
    T? previous;
    bool hasPrevious = false;

    await for (final value in this) {
      if (hasPrevious) {
        yield (previous as T, value);
      }
      previous = value;
      hasPrevious = true;
    }
  }

  /// Scan (reduce with intermediate values)
  Stream<R> scan<R>(R initial, R Function(R accumulated, T value) combine) {
    var accumulated = initial;
    return map((value) {
      accumulated = combine(accumulated, value);
      return accumulated;
    });
  }

  /// Retry on error
  Stream<T> retry([int maxRetries = 3]) {
    var retries = 0;
    final controller = StreamController<T>.broadcast();

    void subscribe() {
      listen(
        controller.add,
        onError: (error) {
          if (retries < maxRetries) {
            retries++;
            subscribe();
          } else {
            controller.addError(error);
          }
        },
        onDone: controller.close,
      );
    }

    subscribe();
    return controller.stream;
  }

  /// Start with initial value
  Stream<T> startWith(T value) async* {
    yield value;
    yield* this;
  }

  /// Start with multiple values
  Stream<T> startWithMany(Iterable<T> values) async* {
    yield* Stream.fromIterable(values);
    yield* this;
  }

  /// End with value
  Stream<T> endWith(T value) async* {
    yield* this;
    yield value;
  }

  /// Switch map - cancel previous inner stream
  Stream<R> switchMap<R>(Stream<R> Function(T value) transform) {
    final controller = StreamController<R>.broadcast();
    StreamSubscription<R>? innerSubscription;

    listen(
      (value) {
        innerSubscription?.cancel();
        innerSubscription = transform(value).listen(
          controller.add,
          onError: controller.addError,
        );
      },
      onError: controller.addError,
      onDone: () {
        innerSubscription?.cancel();
        controller.close();
      },
    );

    return controller.stream;
  }

  /// Exhaust map - ignore new events while processing
  Stream<R> exhaustMap<R>(Stream<R> Function(T value) transform) {
    final controller = StreamController<R>.broadcast();
    bool isProcessing = false;

    listen(
      (value) {
        if (!isProcessing) {
          isProcessing = true;
          transform(value).listen(
            controller.add,
            onError: controller.addError,
            onDone: () => isProcessing = false,
          );
        }
      },
      onError: controller.addError,
      onDone: controller.close,
    );

    return controller.stream;
  }

  /// Concat map - process sequentially
  Stream<R> concatMap<R>(Stream<R> Function(T value) transform) async* {
    await for (final value in this) {
      yield* transform(value);
    }
  }

  /// Share stream (make it broadcast)
  Stream<T> share() {
    final controller = StreamController<T>.broadcast();
    listen(
      controller.add,
      onError: controller.addError,
      onDone: controller.close,
    );
    return controller.stream;
  }

  /// Share and replay last value
  Stream<T> shareReplay({int bufferSize = 1}) {
    final buffer = <T>[];
    final controller = StreamController<T>.broadcast(
      onListen: () {},
    );

    listen(
      (value) {
        buffer.add(value);
        if (buffer.length > bufferSize) {
          buffer.removeAt(0);
        }
        controller.add(value);
      },
      onError: controller.addError,
      onDone: controller.close,
    );

    return controller.stream.transform(
      StreamTransformer.fromHandlers(
        handleData: (data, sink) => sink.add(data),
      ),
    );
  }
}

/// Subscription holder for managing multiple subscriptions
class CompositeSubscription {
  final List<StreamSubscription> _subscriptions = [];

  void add(StreamSubscription subscription) {
    _subscriptions.add(subscription);
  }

  void addAll(Iterable<StreamSubscription> subscriptions) {
    _subscriptions.addAll(subscriptions);
  }

  Future<void> cancel() async {
    for (final sub in _subscriptions) {
      await sub.cancel();
    }
    _subscriptions.clear();
  }

  void pause() {
    for (final sub in _subscriptions) {
      sub.pause();
    }
  }

  void resume() {
    for (final sub in _subscriptions) {
      sub.resume();
    }
  }

  int get length => _subscriptions.length;
  bool get isEmpty => _subscriptions.isEmpty;
  bool get isNotEmpty => _subscriptions.isNotEmpty;
}

/// Subject - both stream and sink
class Subject<T> implements StreamController<T> {
  final StreamController<T> _controller;

  Subject() : _controller = StreamController<T>.broadcast();
  Subject.seeded(T value) : _controller = StreamController<T>.broadcast() {
    _controller.add(value);
  }

  @override
  Stream<T> get stream => _controller.stream;

  @override
  StreamSink<T> get sink => _controller.sink;

  @override
  void add(T event) => _controller.add(event);

  @override
  void addError(Object error, [StackTrace? stackTrace]) =>
      _controller.addError(error, stackTrace);

  @override
  Future addStream(Stream<T> source, {bool? cancelOnError}) =>
      _controller.addStream(source, cancelOnError: cancelOnError);

  @override
  Future close() => _controller.close();

  @override
  Future get done => _controller.done;

  @override
  bool get hasListener => _controller.hasListener;

  @override
  bool get isClosed => _controller.isClosed;

  @override
  bool get isPaused => _controller.isPaused;

  @override
  ControllerCallback? get onCancel => _controller.onCancel;

  @override
  set onCancel(ControllerCallback? callback) => _controller.onCancel = callback;

  @override
  ControllerCallback? get onListen => _controller.onListen;

  @override
  set onListen(ControllerCallback? callback) => _controller.onListen = callback;

  @override
  ControllerCallback? get onPause => _controller.onPause;

  @override
  set onPause(ControllerCallback? callback) => _controller.onPause = callback;

  @override
  ControllerCallback? get onResume => _controller.onResume;

  @override
  set onResume(ControllerCallback? callback) => _controller.onResume = callback;
}

/// BehaviorSubject - replays last value to new subscribers
class BehaviorSubject<T> extends Subject<T> {
  T? _lastValue;
  bool _hasValue = false;

  BehaviorSubject();

  BehaviorSubject.seeded(T value) {
    _lastValue = value;
    _hasValue = true;
  }

  T? get value => _lastValue;
  bool get hasValue => _hasValue;

  @override
  void add(T event) {
    _lastValue = event;
    _hasValue = true;
    super.add(event);
  }

  @override
  Stream<T> get stream {
    if (_hasValue) {
      return super.stream.startWith(_lastValue as T);
    }
    return super.stream;
  }
}

/// ReplaySubject - replays multiple values to new subscribers
class ReplaySubject<T> extends Subject<T> {
  final int _bufferSize;
  final List<T> _buffer = [];

  ReplaySubject({int bufferSize = 1}) : _bufferSize = bufferSize;

  List<T> get values => List.unmodifiable(_buffer);

  @override
  void add(T event) {
    _buffer.add(event);
    if (_buffer.length > _bufferSize) {
      _buffer.removeAt(0);
    }
    super.add(event);
  }

  @override
  Stream<T> get stream {
    if (_buffer.isNotEmpty) {
      return super.stream.startWithMany(_buffer);
    }
    return super.stream;
  }
}
