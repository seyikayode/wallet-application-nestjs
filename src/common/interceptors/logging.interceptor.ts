import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
  
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private logger = new Logger('HTTP');
  
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const req = context.switchToHttp().getRequest();
      const { method, originalUrl, body, query, params } = req;
  
      const startTime = Date.now();
  
      this.logger.log(`-- ${method} ${originalUrl}`);
      this.logger.debug(`Params: ${JSON.stringify(params)}`);
      this.logger.debug(`Query: ${JSON.stringify(query)}`);
    //   this.logger.debug(`Body: ${JSON.stringify(body)}`);
  
      return next.handle().pipe(
        tap((data) => {
          const responseTime = Date.now() - startTime;
          this.logger.log(`-- ${method} ${originalUrl} (${responseTime}ms)`);
          this.logger.debug(`Response: ${JSON.stringify(data)}`);
        }),
      );
    }
};