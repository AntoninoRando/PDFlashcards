export class AutoReveal {
    public static symbol: string = 'autoReveal';

    public toJson(): object {
        return {
            name: "AutoReveal",
            vueComponent: null,
            autoReveal: true,
        };
    }
}
