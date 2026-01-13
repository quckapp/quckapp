import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Phone Number Validator (E.164 format)
@ValidatorConstraint({ async: false })
export class IsPhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(phoneNumber: string, args: ValidationArguments): boolean {
    if (!phoneNumber) {
      return false;
    }
    // E.164 format: + followed by 1-15 digits
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Phone number must be in valid E.164 format (e.g., +1234567890)';
  }
}

export function IsPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPhoneNumberConstraint,
    });
  };
}

// Strong Password Validator
@ValidatorConstraint({ async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string, args: ValidationArguments): boolean {
    if (!password) {
      return false;
    }
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return strongPasswordRegex.test(password);
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

// Username Validator (alphanumeric, underscores, no spaces)
@ValidatorConstraint({ async: false })
export class IsUsernameConstraint implements ValidatorConstraintInterface {
  validate(username: string, args: ValidationArguments): boolean {
    if (!username) {
      return false;
    }
    // Alphanumeric and underscores, 3-30 characters
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    return usernameRegex.test(username);
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Username must be 3-30 characters and contain only letters, numbers, and underscores';
  }
}

export function IsUsername(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUsernameConstraint,
    });
  };
}

// Future Date Validator
@ValidatorConstraint({ async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(date: string | Date, args: ValidationArguments): boolean {
    if (!date) {
      return false;
    }
    const inputDate = new Date(date);
    const now = new Date();
    return inputDate > now;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Date must be in the future';
  }
}

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFutureDateConstraint,
    });
  };
}

// MongoDB ObjectId Validator
@ValidatorConstraint({ async: false })
export class IsObjectIdConstraint implements ValidatorConstraintInterface {
  validate(id: string, args: ValidationArguments): boolean {
    if (!id) {
      return false;
    }
    // MongoDB ObjectId is 24 hex characters
    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    return objectIdRegex.test(id);
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Invalid ID format';
  }
}

export function IsObjectId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsObjectIdConstraint,
    });
  };
}

// No Profanity Validator (basic implementation)
@ValidatorConstraint({ async: false })
export class NoProfanityConstraint implements ValidatorConstraintInterface {
  private profanityList = ['badword1', 'badword2']; // Add actual words in production

  validate(text: string, args: ValidationArguments): boolean {
    if (!text) {
      return true;
    }
    const lowerText = text.toLowerCase();
    return !this.profanityList.some((word) => lowerText.includes(word));
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Text contains inappropriate content';
  }
}

export function NoProfanity(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: NoProfanityConstraint,
    });
  };
}

// File Extension Validator
@ValidatorConstraint({ async: false })
export class IsAllowedFileExtensionConstraint implements ValidatorConstraintInterface {
  validate(filename: string, args: ValidationArguments): boolean {
    if (!filename) {
      return false;
    }
    const allowedExtensions = args.constraints[0] as string[];
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? allowedExtensions.includes(ext) : false;
  }

  defaultMessage(args: ValidationArguments): string {
    const allowedExtensions = args.constraints[0] as string[];
    return `File must have one of these extensions: ${allowedExtensions.join(', ')}`;
  }
}

export function IsAllowedFileExtension(
  allowedExtensions: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [allowedExtensions],
      validator: IsAllowedFileExtensionConstraint,
    });
  };
}

// Match Property Validator (for password confirmation)
@ValidatorConstraint({ async: false })
export class MatchConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    return value === relatedValue;
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} must match ${relatedPropertyName}`;
  }
}

export function Match(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: MatchConstraint,
    });
  };
}

// Sanitize HTML (strips HTML tags)
@ValidatorConstraint({ async: false })
export class SanitizeHtmlConstraint implements ValidatorConstraintInterface {
  validate(text: string, args: ValidationArguments): boolean {
    // This validator always passes, but you can use it with Transform
    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Invalid text';
  }
}

// Transform decorator to sanitize HTML
export function SanitizeHtml() {
  return function (target: any, propertyKey: string) {
    let value: string;

    const getter = function () {
      return value;
    };

    const setter = function (newVal: string) {
      if (typeof newVal === 'string') {
        // Basic HTML tag stripping
        value = newVal.replace(/<[^>]*>/g, '');
      } else {
        value = newVal;
      }
    };

    Object.defineProperty(target, propertyKey, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true,
    });
  };
}
