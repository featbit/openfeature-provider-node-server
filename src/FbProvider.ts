import {
    EvaluationContext,
    Hook,
    JsonValue,
    Logger,
    OpenFeatureEventEmitter,
    Provider,
    ProviderEvents,
    ProviderStatus,
    ResolutionDetails,
} from "@openfeature/server-sdk";
import {
    BasicLogger,
    FbClientBuilder,
    ILogger,
    IFbClientWithEvents,
    IOptions
} from "@featbit/node-server-sdk";
import SafeLogger from "./SafeLogger";
import { translateContext } from "./translateContext";
import { translateResult } from "./translateResult";


/**
 * An OpenFeature provider for the LaunchDarkly SDK for node.
 */
export class FbProvider implements Provider {
    metadata: {
        name: 'featbit-node-provider',
    };

    private readonly logger: ILogger;
    private readonly client: IFbClientWithEvents;
    private readonly clientConstructionError: any;
    private innerStatus: ProviderStatus = ProviderStatus.NOT_READY;

    public readonly events = new OpenFeatureEventEmitter();

    /**
     * Construct a {@link FbProvider}.
     * @param options The {@link IOptions} to initialize the FeatBit client instance.
     */
    constructor(options: IOptions) {
        if (options.logger) {
            this.logger = new SafeLogger(options.logger, new BasicLogger({ level: 'info' }));
        } else {
            this.logger = new BasicLogger({ level: 'info' });
        }

        try {
            this.client = new FbClientBuilder(options).build();
            this.client.on('update', ({ key }: { key: string }) => this.events.emit(ProviderEvents.ConfigurationChanged, { flagsChanged: [key] }))
        } catch(err) {
            this.clientConstructionError = err;
            this.logger.error(`Encountered unrecoverable initialization error, ${err}`);
            this.innerStatus = ProviderStatus.ERROR;
        }
    }

    async initialize(context?: EvaluationContext): Promise<void> {
        if (!this.client) {
            // The client could not be constructed.
            if (this.clientConstructionError) {
                throw this.clientConstructionError;
            }
            throw new Error('Unknown problem encountered during initialization');
        }
        try {
            await this.client.waitForInitialization();
            this.innerStatus = ProviderStatus.READY;
        } catch (e) {
            this.innerStatus = ProviderStatus.ERROR;
            throw e;
        }
    }

    /**
     * Determines the boolean variation of a feature flag for a context, along with information about
     * how it was calculated.
     *
     * If the flag does not evaluate to a boolean value, then the defaultValue will be returned.
     *
     * @param flagKey The unique key of the feature flag.
     * @param defaultValue The default value of the flag, to be used if the value is not available
     *   from LaunchDarkly.
     * @param context The context requesting the flag.
     * @returns A promise which will resolve to a ResolutionDetails.
     */
    async resolveBooleanEvaluation(
      flagKey: string,
      defaultValue: boolean,
      context: EvaluationContext
    ): Promise<ResolutionDetails<boolean>> {
        const res = await this.client.boolVariationDetail(
          flagKey,
          translateContext(context),
          defaultValue,
        );

        return Promise.resolve(translateResult(res));
    }

    /**
     * Determines the string variation of a feature flag for a context, along with information about
     * how it was calculated.
     *
     * If the flag does not evaluate to a string value, then the defaultValue will be returned.
     *
     * @param flagKey The unique key of the feature flag.
     * @param defaultValue The default value of the flag, to be used if the value is not available
     *   from LaunchDarkly.
     * @param context The context requesting the flag.
     * @returns A promise which will resolve to a ResolutionDetails.
     */
    async resolveStringEvaluation(
      flagKey: string,
      defaultValue: string,
      context: EvaluationContext
    ): Promise<ResolutionDetails<string>> {
        const res = await this.client.stringVariationDetail(
          flagKey,
          translateContext(context),
          defaultValue,
        );

        return Promise.resolve(translateResult(res));
    }

    /**
     * Determines the numeric variation of a feature flag for a context, along with information about
     * how it was calculated.
     *
     * If the flag does not evaluate to a numeric value, then the defaultValue will be returned.
     *
     * @param flagKey The unique key of the feature flag.
     * @param defaultValue The default value of the flag, to be used if the value is not available
     *   from LaunchDarkly.
     * @param context The context requesting the flag.
     * @returns A promise which will resolve to a ResolutionDetails.
     */
    async resolveNumberEvaluation(
      flagKey: string,
      defaultValue: number,
      context: EvaluationContext
    ): Promise<ResolutionDetails<number>> {
        const res = await this.client.numberVariationDetail(
          flagKey,
          translateContext(context),
          defaultValue,
        );

        return Promise.resolve(translateResult(res));
    }

    /**
     * Determines the object variation of a feature flag for a context, along with information about
     * how it was calculated.
     *
     * @param flagKey The unique key of the feature flag.
     * @param defaultValue The default value of the flag, to be used if the value is not available
     *   from LaunchDarkly.
     * @param context The context requesting the flag.
     * @returns A promise which will resolve to a ResolutionDetails.
     */
    async resolveObjectEvaluation<T extends JsonValue>(
      flagKey: string,
      defaultValue: T,
      context: EvaluationContext
    ): Promise<ResolutionDetails<T>> {
        const res = await this.client.jsonVariationDetail(
          flagKey,
          translateContext(context),
          defaultValue,
        );

        return Promise.resolve(translateResult<T>(res));
    }

    /**
     * Get the status of the LaunchDarkly provider.
     */
    public get status() {
        return this.innerStatus;
    }

    get hooks(): Hook[] {
        return [];
    }

    /**
     * Get the IFbClientWithEvents instance used by this provider.
     *
     * @returns The client for this provider.
     */
    public getClient() {
        return this.client;
    }

    async onClose(): Promise<void> {
        await this.client.close();
    }
}