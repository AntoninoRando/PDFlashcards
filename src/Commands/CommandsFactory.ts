import { Header } from "./All/Header";
import { PageRef } from "./All/PageRef";
import { Remember } from "./All/Remember";
import { Tag } from "./All/Tag";
import { AutoReveal } from "./All/AutoReveal";
import { Alias } from "./All/Alias";
import { Recap } from "./All/Recap";
import { Example } from "./All/Example";
import { RecallData } from "./All/RecallData";
import { LineDescriptor, IStudySet } from "@/FlashcardParser/Types/Types";

export class CommandsFactory {
    static Make(
        lineDescriptor: LineDescriptor,
        studySet: IStudySet,
        commandNameOrShortcut: string,
        commandArgument: string | null,
    ) {
        if (commandNameOrShortcut[0] === '\\') {
            commandNameOrShortcut = commandNameOrShortcut.slice(1);
        }

        let p = commandNameOrShortcut.indexOf('(');
        if (p !== -1) {
            commandNameOrShortcut = commandNameOrShortcut.slice(0, p);
        }

        switch (commandNameOrShortcut) {
            case PageRef.symbol:
            case 'page':
                return new PageRef(commandArgument);
            case Remember.symbol:
            case 'remember':
                return new Remember(commandArgument);
            case Tag.symbol:
            case 'tag':
                return new Tag(commandArgument || "");
            case AutoReveal.symbol:
            case 'auto_reveal':
                return new AutoReveal();
            case Alias.symbol:
            case 'alias':
                const alias = new Alias(commandArgument, lineDescriptor, studySet);
                return alias.isValid ? alias : null
            case Header.symbol:
            case 'header':
                return new Header(lineDescriptor, studySet, commandArgument || 1);
            case RecallData.symbol:
            case 'recall_data':
                return new RecallData(lineDescriptor, studySet, commandArgument || '');
            case 'recap':
            case 'Recap':
                return new Recap(lineDescriptor, commandArgument);
            case 'example':
            case 'Example':
                return new Example(lineDescriptor, commandArgument);
            default:
                console.log(`[MakeCommand] Unrecognized command ${commandNameOrShortcut}`)
                return null;
        }
    }
}
