import VueTextBox from "../Components/VueTextBox.vue";

export class TextBox {
	public static symbol: string = '...';
	public static commandName: string = 'textbox';

	public text: string;

	constructor(text: string) {
		this.text = text || '';
	}

	public toJson(): ITextBox {
		return {
			name: TextBox.commandName,
			vueComponent: VueTextBox,
			text: this.text
		};
	}
}

export interface ITextBox {
	name: string;
	vueComponent: any;
	text: string;
}
