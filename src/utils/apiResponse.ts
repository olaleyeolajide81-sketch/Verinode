export class ApiResponse {
  static success(data: any, message?: string) {
    return {
      success: true,
      data,
      message: message || 'Operation successful',
      timestamp: new Date().toISOString()
    };
  }

  static error(message: string, statusCode: number = 500, details?: any) {
    return {
      success: false,
      error: {
        message,
        statusCode,
        details,
        timestamp: new Date().toISOString()
      }
    };
  }

  static validationError(errors: any[]) {
    return {
      success: false,
      error: {
        message: 'Validation failed',
        statusCode: 400,
        errors,
        timestamp: new Date().toISOString()
      }
    };
  }

  static paginated(data: any[], total: number, page: number, limit: number) {
    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      timestamp: new Date().toISOString()
    };
  }
}
