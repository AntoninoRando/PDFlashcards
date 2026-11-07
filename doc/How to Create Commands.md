# How to Create Commands

Suppose you want to create a command called "High Priority", written in a study set as

```
[Cards]
What is a deadlock? .. 12
	! 3
```

## 1. Create the Logical File
1. Create a _typescript_ file inside [`/src/Commands/All`](../src/Commands/All/), named after the command in PascalCase: in this case `HighPriority.ts`;
2. Inside `HighPriority.ts` create and export a class with the same name;
3. Add a static `symbol` (the shortcut used in study sets) and a static `commandName`;
4. Add any necessary public fields and a constructor that initializes them from the command argument (a `string`, or `null` when the command has no argument);
5. Add a public `toJson` method returning an object with a record for each public field, plus `name` (the command name) and `vueComponent` (the Vue component that displays the command on the card, or `null` if it has nothing to display).

```ts
import VueHighPriority from "../Components/VueHighPriority.vue";

export class HighPriority {
  public static symbol: string = "!";
  public static commandName: string = "HighPriority";

  public priorityLevel: number;

  constructor(priorityLevel?: string | null) {
    this.priorityLevel = Number(priorityLevel ?? 0);
  }

  public toJson(): object {
    return {
      name: HighPriority.commandName,
      vueComponent: VueHighPriority,
      priorityLevel: this.priorityLevel,
    };
  }
}
```

If the command needs to change the card it belongs to (like `RecallData` or `Skip`), also accept the `LineDescriptor` and the `IStudySet` in the constructor: the card is the one whose `lineDescriptor` is `lineDescriptor.parent`.

## 2. Create the Vue Component
Create a _vue_ file inside [`/src/Commands/Components`](../src/Commands/Components/) starting with the word "Vue", like `VueHighPriority.vue`. It receives the object returned by `toJson` as the `config` prop:

```vue
<template>
  <span class="priority">Priority {{ config.priorityLevel }}</span>
</template>

<script setup lang="ts">
defineProps<{ config: { priorityLevel: number } }>();
</script>
```

## 3. Register the Command
Add a `case` for the command (its symbol and its full name) in [`CommandsFactory.ts`](../src/Commands/CommandsFactory.ts):

```ts
case HighPriority.symbol:
case 'high_priority':
    return new HighPriority(commandArgument);
```

## 4. Keep the Python Service in Sync
The service has a port of the parser in [`service/flashcard_parser`](../service/flashcard_parser/). Add the command to `commands/` and register it in `commands/commands_factory.py`, otherwise `POST /api/flashcards/parse` rejects study sets that use it.

## 5. Test It
Add a case to [`tests/StudySetParser.test.ts`](../tests/StudySetParser.test.ts) (and `service/tests/test_parser.py`) and run `npm test`.
