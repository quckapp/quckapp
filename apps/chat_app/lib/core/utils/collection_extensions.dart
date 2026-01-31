import 'dart:math' as math;

/// Extensions for Iterable
extension IterableExtensions<T> on Iterable<T> {
  /// Get first element or null
  T? get firstOrNull => isEmpty ? null : first;

  /// Get last element or null
  T? get lastOrNull => isEmpty ? null : last;

  /// Get single element or null
  T? get singleOrNull => length == 1 ? single : null;

  /// Find first element matching predicate or null
  T? firstWhereOrNull(bool Function(T element) test) {
    for (final element in this) {
      if (test(element)) return element;
    }
    return null;
  }

  /// Find last element matching predicate or null
  T? lastWhereOrNull(bool Function(T element) test) {
    T? result;
    for (final element in this) {
      if (test(element)) result = element;
    }
    return result;
  }

  /// Map with index
  Iterable<R> mapIndexed<R>(R Function(int index, T element) transform) sync* {
    var index = 0;
    for (final element in this) {
      yield transform(index++, element);
    }
  }

  /// Where with index
  Iterable<T> whereIndexed(bool Function(int index, T element) test) sync* {
    var index = 0;
    for (final element in this) {
      if (test(index++, element)) yield element;
    }
  }

  /// ForEach with index
  void forEachIndexed(void Function(int index, T element) action) {
    var index = 0;
    for (final element in this) {
      action(index++, element);
    }
  }

  /// Reduce or null if empty
  T? reduceOrNull(T Function(T value, T element) combine) {
    if (isEmpty) return null;
    return reduce(combine);
  }

  /// Fold with index
  R foldIndexed<R>(R initial, R Function(int index, R acc, T element) combine) {
    var index = 0;
    var result = initial;
    for (final element in this) {
      result = combine(index++, result, element);
    }
    return result;
  }

  /// Group by key
  Map<K, List<T>> groupBy<K>(K Function(T element) keyOf) {
    final result = <K, List<T>>{};
    for (final element in this) {
      final key = keyOf(element);
      (result[key] ??= []).add(element);
    }
    return result;
  }

  /// Group by key and transform values
  Map<K, List<V>> groupByMap<K, V>(
    K Function(T element) keyOf,
    V Function(T element) valueOf,
  ) {
    final result = <K, List<V>>{};
    for (final element in this) {
      final key = keyOf(element);
      (result[key] ??= []).add(valueOf(element));
    }
    return result;
  }

  /// Partition into two lists based on predicate
  (List<T> matched, List<T> unmatched) partition(
    bool Function(T element) predicate,
  ) {
    final matched = <T>[];
    final unmatched = <T>[];
    for (final element in this) {
      (predicate(element) ? matched : unmatched).add(element);
    }
    return (matched, unmatched);
  }

  /// Chunk into lists of specified size
  Iterable<List<T>> chunked(int size) sync* {
    final iterator = this.iterator;
    while (iterator.moveNext()) {
      final chunk = <T>[iterator.current];
      for (var i = 1; i < size && iterator.moveNext(); i++) {
        chunk.add(iterator.current);
      }
      yield chunk;
    }
  }

  /// Sliding window
  Iterable<List<T>> windowed(int size, {int step = 1}) sync* {
    final list = toList();
    if (size > list.length) return;

    for (var i = 0; i <= list.length - size; i += step) {
      yield list.sublist(i, i + size);
    }
  }

  /// Zip with another iterable
  Iterable<(T, R)> zip<R>(Iterable<R> other) sync* {
    final iter1 = iterator;
    final iter2 = other.iterator;
    while (iter1.moveNext() && iter2.moveNext()) {
      yield (iter1.current, iter2.current);
    }
  }

  /// Zip with index
  Iterable<(int, T)> zipWithIndex() sync* {
    var index = 0;
    for (final element in this) {
      yield (index++, element);
    }
  }

  /// Interleave with another iterable
  Iterable<T> interleave(Iterable<T> other) sync* {
    final iter1 = iterator;
    final iter2 = other.iterator;
    while (iter1.moveNext()) {
      yield iter1.current;
      if (iter2.moveNext()) {
        yield iter2.current;
      }
    }
    while (iter2.moveNext()) {
      yield iter2.current;
    }
  }

  /// Flatten nested iterables
  Iterable<T> flatten() sync* {
    for (final element in this) {
      if (element is Iterable<T>) {
        yield* element.flatten();
      } else {
        yield element;
      }
    }
  }

  /// Distinct by key
  Iterable<T> distinctBy<K>(K Function(T element) keyOf) sync* {
    final seen = <K>{};
    for (final element in this) {
      final key = keyOf(element);
      if (seen.add(key)) {
        yield element;
      }
    }
  }

  /// Sort by comparable key
  List<T> sortedBy<K extends Comparable<K>>(K Function(T element) keyOf) {
    return toList()..sort((a, b) => keyOf(a).compareTo(keyOf(b)));
  }

  /// Sort by comparable key descending
  List<T> sortedByDescending<K extends Comparable<K>>(
    K Function(T element) keyOf,
  ) {
    return toList()..sort((a, b) => keyOf(b).compareTo(keyOf(a)));
  }

  /// Sort with custom comparator
  List<T> sortedWith(int Function(T a, T b) compare) {
    return toList()..sort(compare);
  }

  /// Reversed as list
  List<T> get reversedList => toList().reversed.toList();

  /// Take last n elements
  Iterable<T> takeLast(int count) {
    final list = toList();
    if (count >= list.length) return list;
    return list.sublist(list.length - count);
  }

  /// Skip last n elements
  Iterable<T> skipLast(int count) {
    final list = toList();
    if (count >= list.length) return const [];
    return list.sublist(0, list.length - count);
  }

  /// None match predicate
  bool none(bool Function(T element) test) => !any(test);

  /// All elements are equal
  bool allEqual() {
    if (isEmpty) return true;
    final first = this.first;
    return every((element) => element == first);
  }

  /// Count elements matching predicate
  int count([bool Function(T element)? test]) {
    if (test == null) return length;
    return fold(0, (count, e) => test(e) ? count + 1 : count);
  }

  /// Sum of elements (requires numeric type)
  T sum() {
    if (isEmpty) {
      if (T == int) return 0 as T;
      if (T == double) return 0.0 as T;
      throw StateError('Cannot sum empty iterable of type $T');
    }
    return reduce((a, b) {
      if (a is num && b is num) return (a + b) as T;
      throw ArgumentError('Cannot sum non-numeric types');
    });
  }

  /// Average of elements (requires numeric type)
  double average() {
    if (isEmpty) return 0.0;
    var sum = 0.0;
    var count = 0;
    for (final element in this) {
      if (element is num) {
        sum += element;
        count++;
      }
    }
    return count > 0 ? sum / count : 0.0;
  }

  /// Max element by key
  T? maxBy<K extends Comparable<K>>(K Function(T element) keyOf) {
    if (isEmpty) return null;
    return reduce((a, b) => keyOf(a).compareTo(keyOf(b)) >= 0 ? a : b);
  }

  /// Min element by key
  T? minBy<K extends Comparable<K>>(K Function(T element) keyOf) {
    if (isEmpty) return null;
    return reduce((a, b) => keyOf(a).compareTo(keyOf(b)) <= 0 ? a : b);
  }

  /// Join with transform
  String joinWith(
    String separator, {
    String Function(T element)? transform,
  }) {
    if (transform != null) {
      return map(transform).join(separator);
    }
    return join(separator);
  }

  /// Random element
  T? randomOrNull([math.Random? random]) {
    if (isEmpty) return null;
    final list = toList();
    return list[(random ?? math.Random()).nextInt(list.length)];
  }

  /// Shuffle as new list
  List<T> shuffled([math.Random? random]) {
    return toList()..shuffle(random);
  }
}

/// Extensions for List
extension ListExtensions<T> on List<T> {
  /// Safe get at index
  T? getOrNull(int index) {
    if (index < 0 || index >= length) return null;
    return this[index];
  }

  /// Get or default
  T getOrElse(int index, T defaultValue) {
    if (index < 0 || index >= length) return defaultValue;
    return this[index];
  }

  /// Safe set at index
  void setIfExists(int index, T value) {
    if (index >= 0 && index < length) {
      this[index] = value;
    }
  }

  /// Swap elements at indices
  void swap(int i, int j) {
    final temp = this[i];
    this[i] = this[j];
    this[j] = temp;
  }

  /// Move element from one index to another
  void move(int from, int to) {
    if (from == to) return;
    final element = removeAt(from);
    insert(to > from ? to - 1 : to, element);
  }

  /// Insert all at index
  void insertAllAt(int index, Iterable<T> elements) {
    insertAll(index, elements);
  }

  /// Remove and return first element
  T? removeFirstOrNull() {
    if (isEmpty) return null;
    return removeAt(0);
  }

  /// Remove and return last element
  T? removeLastOrNull() {
    if (isEmpty) return null;
    return removeLast();
  }

  /// Remove all matching elements and return them
  List<T> removeWhere2(bool Function(T element) test) {
    final removed = <T>[];
    removeWhere((element) {
      if (test(element)) {
        removed.add(element);
        return true;
      }
      return false;
    });
    return removed;
  }

  /// Binary search (requires sorted list)
  int binarySearch(T element, int Function(T a, T b) compare) {
    var low = 0;
    var high = length - 1;

    while (low <= high) {
      final mid = (low + high) ~/ 2;
      final cmp = compare(this[mid], element);

      if (cmp < 0) {
        low = mid + 1;
      } else if (cmp > 0) {
        high = mid - 1;
      } else {
        return mid;
      }
    }

    return -1;
  }

  /// Insert in sorted order
  void insertSorted(T element, int Function(T a, T b) compare) {
    var low = 0;
    var high = length;

    while (low < high) {
      final mid = (low + high) ~/ 2;
      if (compare(this[mid], element) < 0) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    insert(low, element);
  }

  /// Split at index
  (List<T>, List<T>) splitAt(int index) {
    return (sublist(0, index), sublist(index));
  }

  /// Rotate list by n positions
  void rotate(int n) {
    if (isEmpty || n == 0) return;
    final effectiveN = n % length;
    if (effectiveN == 0) return;

    final temp = sublist(0, effectiveN);
    removeRange(0, effectiveN);
    addAll(temp);
  }
}

/// Extensions for Map
extension MapExtensions<K, V> on Map<K, V> {
  /// Get or put default
  V getOrPut(K key, V Function() defaultValue) {
    return this[key] ??= defaultValue();
  }

  /// Get or null
  V? getOrNull(K key) => this[key];

  /// Get or default
  V getOrElse(K key, V defaultValue) => this[key] ?? defaultValue;

  /// Map keys
  Map<K2, V> mapKeys<K2>(K2 Function(K key) transform) {
    return {for (final entry in entries) transform(entry.key): entry.value};
  }

  /// Map values
  Map<K, V2> mapValues<V2>(V2 Function(V value) transform) {
    return {for (final entry in entries) entry.key: transform(entry.value)};
  }

  /// Map entries
  Map<K2, V2> mapEntries<K2, V2>(
    MapEntry<K2, V2> Function(K key, V value) transform,
  ) {
    return Map.fromEntries(entries.map((e) => transform(e.key, e.value)));
  }

  /// Filter by key
  Map<K, V> filterKeys(bool Function(K key) test) {
    return {for (final e in entries) if (test(e.key)) e.key: e.value};
  }

  /// Filter by value
  Map<K, V> filterValues(bool Function(V value) test) {
    return {for (final e in entries) if (test(e.value)) e.key: e.value};
  }

  /// Merge with another map
  Map<K, V> mergeWith(
    Map<K, V> other, {
    V Function(V a, V b)? onConflict,
  }) {
    final result = Map<K, V>.from(this);
    for (final entry in other.entries) {
      if (result.containsKey(entry.key) && onConflict != null) {
        result[entry.key] = onConflict(result[entry.key] as V, entry.value);
      } else {
        result[entry.key] = entry.value;
      }
    }
    return result;
  }

  /// Invert map (swap keys and values)
  Map<V, K> invert() {
    return {for (final e in entries) e.value: e.key};
  }

  /// Pick specific keys
  Map<K, V> pick(Iterable<K> keys) {
    return {for (final key in keys) if (containsKey(key)) key: this[key] as V};
  }

  /// Omit specific keys
  Map<K, V> omit(Iterable<K> keys) {
    final keysSet = keys.toSet();
    return {for (final e in entries) if (!keysSet.contains(e.key)) e.key: e.value};
  }

  /// Convert to list of entries
  List<MapEntry<K, V>> toEntryList() => entries.toList();

  /// Find entry by predicate
  MapEntry<K, V>? firstEntryWhere(bool Function(K key, V value) test) {
    for (final entry in entries) {
      if (test(entry.key, entry.value)) return entry;
    }
    return null;
  }
}

/// Extensions for Set
extension SetExtensions<T> on Set<T> {
  /// Toggle element (add if not present, remove if present)
  bool toggle(T element) {
    if (contains(element)) {
      remove(element);
      return false;
    } else {
      add(element);
      return true;
    }
  }

  /// Add all and return new set
  Set<T> plus(Iterable<T> elements) => {...this, ...elements};

  /// Remove all and return new set
  Set<T> minus(Iterable<T> elements) {
    final elementsSet = elements.toSet();
    return {for (final e in this) if (!elementsSet.contains(e)) e};
  }

  /// Power set (all subsets)
  Set<Set<T>> powerSet() {
    final result = <Set<T>>{{}};
    for (final element in this) {
      result.addAll([
        for (final subset in result.toList()) {...subset, element}
      ]);
    }
    return result;
  }
}

/// Extensions for nullable iterables
extension NullableIterableExtensions<T> on Iterable<T?> {
  /// Filter out nulls
  Iterable<T> whereNotNull() sync* {
    for (final element in this) {
      if (element != null) yield element;
    }
  }
}

/// Extensions for comparable iterables
extension ComparableIterableExtensions<T extends Comparable<T>> on Iterable<T> {
  /// Max element
  T? max() => isEmpty ? null : reduce((a, b) => a.compareTo(b) >= 0 ? a : b);

  /// Min element
  T? min() => isEmpty ? null : reduce((a, b) => a.compareTo(b) <= 0 ? a : b);

  /// Sorted ascending
  List<T> sorted() => toList()..sort();

  /// Sorted descending
  List<T> sortedDescending() => toList()..sort((a, b) => b.compareTo(a));
}

/// Extensions for num iterables
extension NumIterableExtensions on Iterable<num> {
  /// Sum
  num get sum => fold(0, (a, b) => a + b);

  /// Average
  double get avg => isEmpty ? 0 : sum / length;

  /// Product
  num get product => fold(1, (a, b) => a * b);

  /// Max value
  num? get maxValue => isEmpty ? null : reduce(math.max);

  /// Min value
  num? get minValue => isEmpty ? null : reduce(math.min);

  /// Range (max - min)
  num get range {
    if (isEmpty) return 0;
    num min = first;
    num max = first;
    for (final value in skip(1)) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
    return max - min;
  }
}
