import { parse } from 'graphql';
import { plugin } from '../src';
describe('svelte urql operations store types', () => {
    it('Should ouput correct results based on operations only', async () => {
        const result = (await plugin(null, [
            {
                document: parse(`query me { id }`),
            },
            {
                document: parse(`mutation doSomething { id }`),
            },
            {
                document: parse(`query { id }`),
            },
            {
                document: parse(`fragment Test on Test { t }`),
            },
        ], {}));
        expect(result.content).toContain('export type MeQueryStore = OperationStore<MeQuery, MeQueryVariables>;');
        expect(result.content).toContain('export type DoSomethingMutationStore = OperationStore<DoSomethingMutation, DoSomethingMutationVariables>;');
        expect(result.prepend).toContain(`import type { OperationStore } from '@urql/svelte';`);
    });
});
//# sourceMappingURL=plugins.spec.js.map