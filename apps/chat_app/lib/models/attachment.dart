import 'package:equatable/equatable.dart';

/// Represents a file attachment in a message
class Attachment extends Equatable {
  final String id;
  final String type;
  final String url;
  final String? name;
  final int? size;
  final String? mimeType;
  final String? thumbnailUrl;
  final int? width;
  final int? height;
  final int? duration; // For audio/video in seconds

  const Attachment({
    required this.id,
    required this.type,
    required this.url,
    this.name,
    this.size,
    this.mimeType,
    this.thumbnailUrl,
    this.width,
    this.height,
    this.duration,
  });

  bool get isImage => type == 'image';
  bool get isVideo => type == 'video';
  bool get isAudio => type == 'audio';
  bool get isFile => type == 'file';

  factory Attachment.fromJson(Map<String, dynamic> json) {
    return Attachment(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? 'file',
      url: json['url'] as String? ?? '',
      name: json['name'] as String?,
      size: json['size'] as int?,
      mimeType: json['mimeType'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      width: json['width'] as int?,
      height: json['height'] as int?,
      duration: json['duration'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'url': url,
      'name': name,
      'size': size,
      'mimeType': mimeType,
      'thumbnailUrl': thumbnailUrl,
      'width': width,
      'height': height,
      'duration': duration,
    };
  }

  @override
  List<Object?> get props => [id, type, url, name, size, mimeType, thumbnailUrl, width, height, duration];
}
