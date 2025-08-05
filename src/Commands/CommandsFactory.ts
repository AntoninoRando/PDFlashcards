import { Header } from "./all/Header";
import { PageRef } from "./all/PageRef";
import { Remember } from "./all/Remember";
import { Tag } from "./all/Tag";
import { AutoReveal } from "./all/AutoReveal";

export class CommandsFactory {
    static Make(commandNameOrShortcut: string, commandArgument: string | null, lineObject: any = null) {
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
            case 'alias':
                if (lineObject) {
                    if (!lineObject.alias) {
                        lineObject.alias = [];
                    }
                    lineObject.alias.push(commandArgument || "");
                }
                return null;
            case '^':
                return new Header(commandArgument || 1);
            default:
                return new PageRef(commandArgument || '');
        }
    }
}