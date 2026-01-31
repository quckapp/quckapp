class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final String? code;
  final dynamic data;

  ApiException({
    required this.message,
    this.statusCode,
    this.code,
    this.data,
  });

  factory ApiException.fromResponse(dynamic response, int? statusCode) {
    if (response is Map<String, dynamic>) {
      return ApiException(
        message: response['message'] ?? response['error'] ?? 'An error occurred',
        statusCode: statusCode,
        code: response['code'],
        data: response,
      );
    }
    return ApiException(
      message: 'An error occurred',
      statusCode: statusCode,
    );
  }

  @override
  String toString() => 'ApiException: $message (status: $statusCode, code: $code)';
}

class UnauthorizedException extends ApiException {
  UnauthorizedException({String? message})
      : super(
          message: message ?? 'Unauthorized. Please login again.',
          statusCode: 401,
        );
}

class ForbiddenException extends ApiException {
  ForbiddenException({String? message})
      : super(
          message: message ?? 'You do not have permission to perform this action.',
          statusCode: 403,
        );
}

class NotFoundException extends ApiException {
  NotFoundException({String? message})
      : super(
          message: message ?? 'Resource not found.',
          statusCode: 404,
        );
}

class NetworkException extends ApiException {
  NetworkException({String? message})
      : super(
          message: message ?? 'Network error. Please check your connection.',
          statusCode: 0,
        );
}
