export class Header {
  public num: number;

  constructor(num: number | string) {
    this.num = Number(num);
  }

  public toJson(): object {
    return {
      name: 'Header',
      vueComponent: null,
      level: this.num
    }
  }
}
