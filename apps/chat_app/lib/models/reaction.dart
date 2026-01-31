import 'package:equatable/equatable.dart';

/// Represents a reaction to a message
class Reaction extends Equatable {
  final String emoji;
  final List<String> userIds;
  final int count;

  const Reaction({
    required this.emoji,
    required this.userIds,
    int? count,
  }) : count = count ?? userIds.length;

  bool hasReacted(String userId) => userIds.contains(userId);

  factory Reaction.fromJson(Map<String, dynamic> json) {
    final userIds = (json['userIds'] as List<dynamic>?)
            ?.map((e) => e as String)
            .toList() ??
        [];
    return Reaction(
      emoji: json['emoji'] as String? ?? '',
      userIds: userIds,
      count: json['count'] as int? ?? userIds.length,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'emoji': emoji,
      'userIds': userIds,
      'count': count,
    };
  }

  Reaction copyWith({
    String? emoji,
    List<String>? userIds,
    int? count,
  }) {
    return Reaction(
      emoji: emoji ?? this.emoji,
      userIds: userIds ?? this.userIds,
      count: count,
    );
  }

  @override
  List<Object?> get props => [emoji, userIds, count];
}
