# Project Structure

**Ignore** the following directories:
- `/public`
- `/service`
- `/.vscode`

Source code files:
- `/src`
    - `/assets`: contains CSS files, images, and other assets used for styling.
    - `/commands` (**IMPORTANT**): contains all the files that manage the "flashcard" command used in the Domain Specific Language (DSL) for creating study-sets.
        - `/all`: contains a file for each command, implementing the logic of that command;
        - `/components`: contains a file for each command, implementing the Vue component for visualize that command
        - `CommandsFactory.ts`: contains a class with a static method used to create the command object (describe in the apposite file in `/all`) by its string representation.

Other useful files:
- `start.sh`: starts the docker volume to run the web app and the python services;
- `startWebapp.sh`: starts only the docker volume to run the web app;