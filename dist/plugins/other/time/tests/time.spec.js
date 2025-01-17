import { plugin } from '../src/index';
describe('Time', () => {
    it('Should use default comment when extenion is unknown', async () => {
        const result = await plugin(null, [], null, { outputFile: null });
        expect(result).toContain('// Generated on');
    });
    it('Should use # prefix for comment when extenion is graphql', async () => {
        const result = await plugin(null, [], null, { outputFile: 'schema.graphql' });
        expect(result).toContain('# Generated on');
    });
});
//# sourceMappingURL=time.spec.js.map