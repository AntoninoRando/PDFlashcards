# How to Create Commands

Suppose you want to create a command called "High Priority"

## 1. Create the Logical File
1. Create a _typescript_ file inside [`/src/commands/all`](../src/commands/all/). It is better to name the file with the same name of the command, in camel case: in this case `HighPriority.ts`;
2. Inside `HighPriority.ts` create a class with the name of the command in camel case and export it, like so:

```ts
export class HighPriority { }
```

3. Add any necessary public fields to the class;
4. Add a constructor to the class that initializes these public fields to some value;
5. Add a public `toJson` method that returns a Json with a record for each public field, plus a record `("name", <name of the component>)` and a record `("vueComponent", <class of the apposite vue component>)` (for this point see later).

An example of such class could be

```ts
export class HighPriority {
  public priorityLevel: number;

  constructor(priorityLevel?: number | string = 0) {
    this.priorityLevel = Number(priorityLevel);
  }

  public toJson(): object {
    return {
      name: 'HighPriority',
      vueComponent: null,
      priorityLevel: this.priorityLevel,
    }
  }
}
```

## 2. Create the Vue Component
1. Create a _vue_ file inside [`/src/commands/components`](../src/commands/components/) starting with the word "Vue", like `VueHighPriority.vue`.