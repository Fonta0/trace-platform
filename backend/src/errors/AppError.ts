// src/errors/AppError.ts

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 400,
    public readonly code: string = "BAD_REQUEST"
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} com ID "${id}" não encontrado.`, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 422, "VALIDATION_ERROR");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Não autorizado.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Permissão negada.") {
    super(message, 403, "FORBIDDEN");
  }
}

// Erros de domínio do TraceService
export class AssetNotFoundError extends Error {
  name = "AssetNotFoundError";
  constructor(assetId: string) {
    super(`Asset com ID "${assetId}" não encontrado.`);
  }
}

export class AssetNotAvailableError extends Error {
  name = "AssetNotAvailableError";
  constructor(assetId: string, currentStatus: string) {
    super(`Asset "${assetId}" não disponível. Status atual: ${currentStatus}.`);
  }
}

export class AssetNotInUseError extends Error {
  name = "AssetNotInUseError";
  constructor(assetId: string, currentStatus: string) {
    super(`Asset "${assetId}" não está em uso. Status atual: ${currentStatus}.`);
  }
}

export class InvalidOperationError extends Error {
  name = "InvalidOperationError";
  constructor(message: string) {
    super(message);
  }
}
