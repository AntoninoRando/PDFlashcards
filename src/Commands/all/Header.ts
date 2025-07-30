export class Header {
  public num: number;
  public text: string;

  constructor(num: number | string, text?: string) {
    this.num = Number(num);
    this.text = text || '';
  }

  public toJson(): object {
    return {
      name: 'Header',
      vueComponent: null,
      level: this.num,
      text: this.text
    }
  }
}
