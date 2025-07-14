import { Header } from "./allCommands/Header";
import { PageRef } from "./allCommands/PageRef";
import { Remember } from "./allCommands/Remember";
import { Tag } from "./allCommands/Tag";
import { AutoReveal } from "./allCommands/AutoReveal";

export class CommandsFactory {
    static Make(commandNameOrShortcut: string, commandArgument: string | null) {
        if (commandNameOrShortcut[0] === '\\') {
            commandNameOrShortcut = commandNameOrShortcut.slice(1);
        }
        
        let p = commandNameOrShortcut.indexOf('(');
        if (p !== -1) {
            commandNameOrShortcut = commandNameOrShortcut.slice(0, p);
        }

        switch (commandNameOrShortcut) {
            case '..':
            case 'page':
                return new PageRef(commandArgument);
            case '+':
            case 'remember':
                return new Remember(commandArgument);
            case '#':
            case 'tag':
                return new Tag(commandArgument || "");
            case '@':
            case 'auto_reveal':
                return new AutoReveal();
            case '^':
                return new Header(commandArgument || 1);
            default:
                return null;
        }
    }
}