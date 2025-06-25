import { PageCard } from "./List/PageCard";
import { Remember } from "./List/Remember";

export class CommandsFactory {
    static Make(commandNameOrShortcut: string, commandArgument: string | null) {
        switch (commandNameOrShortcut) {
            case '..':
            case 'page':
                return new PageCard(commandArgument);
            case '+':
            case 'remember':
                return new Remember(commandArgument);
        }
    }
}