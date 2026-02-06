package com.quckapp.security.common.exception;

import org.springframework.http.HttpStatus;

public class SecurityServiceException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    public SecurityServiceException(String message, HttpStatus status) {
        super(message);
        this.status = status;
        this.errorCode = "SECURITY_ERROR";
    }

    public SecurityServiceException(String message, HttpStatus status, String errorCode) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    public SecurityServiceException(String message, HttpStatus status, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.errorCode = "SECURITY_ERROR";
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
