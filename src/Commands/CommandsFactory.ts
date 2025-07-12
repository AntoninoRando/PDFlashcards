import { Header } from "./allCommands/Header";
import { PageRef } from "./allCommands/PageRef";
import { Remember } from "./allCommands/Remember";

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
            case 'h1':
            case 'example':
            case 'recap':
            case 'tag':
                return new Header(1);
        }
    }
}