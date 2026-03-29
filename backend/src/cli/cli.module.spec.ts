import 'reflect-metadata';
import { CliModule } from './cli.module';

describe('CliModule', () => {
  it('MongooseModule useFactory returns the MongoDB URI from config', () => {
    const imports: any[] = Reflect.getMetadata('imports', CliModule);
    // imports[0] = ConfigModule.forRoot, imports[1] = MongooseModule.forRootAsync
    // forRootAsync wraps the factory inside an inner DynamicModule's providers
    const mongooseDynamicModule = imports[1];
    const innerProviders = mongooseDynamicModule.imports?.[0]?.providers ?? [];
    const factoryProvider = innerProviders.find(
      (p: any) =>
        p?.provide === 'MongooseModuleOptions' &&
        typeof p?.useFactory === 'function',
    );
    expect(factoryProvider).toBeDefined();

    const config = {
      getOrThrow: jest.fn().mockReturnValue('mongodb://localhost/test'),
    };
    const result = factoryProvider.useFactory(config);
    expect(result).toEqual({ uri: 'mongodb://localhost/test' });
    expect(config.getOrThrow).toHaveBeenCalledWith('MONGODB_URI');
  });
});
