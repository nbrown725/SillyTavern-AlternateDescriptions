# SillyTavern Alternate Fields
*Formerly "Alternate Descriptions"*

## Overview

A SillyTavern extension that allows you to save and manage multiple versions of character fields within a single character card. Perfect for experimenting with different character concepts without losing your original work.

**Supported Fields**: Description, Personality, Scenario, Example Dialogue, Main Prompt, Post-History Instructions

## Features

- ✅ **Multi-field support** - Works with 6 different character fields
- ✅ **Auto-save** - Automatically saves current field content on first use
- ✅ **Visual indicators** - Shows which alternate is currently active & warns before switching with unsaved changes
- ✅ **Token counting** - Shows token count for each alternate
- ✅ **Slash command support** - Switch alternates via `/altfield` command
- ✅ **Portable** - Data stored in character card, stays with character

## Installation

1. Open SillyTavern
2. Go to **Extensions** → **Install extension**  
3. Enter the repository URL: `https://github.com/nbrown725/SillyTavern-AlternateDescriptions`
4. Click **Download**
5. The extension will add "Alt. [Field]" buttons above supported fields

## Usage

### Basic Usage
1. **Open the manager**: Click the "Alt. [Field]" button above any supported field in the character editor
2. **Add new alternates**: Click the "Add New" button to create a new alternate (duplicates current content)
3. **Switch alternates**: Click the "Use" button to switch to a different alternate
4. **Edit alternates**: Modify titles and content directly in the popup

### Slash Command Usage

The `/altfield` command allows quick switching between alternates:

```
/altfield field=<field_name> name=<alternate_name>
```

**Arguments:**
- `field` - The field type (description, personality, scenario, etc.) - **Required**
- `name` - The name of the alternate to switch to - **Optional**

**Examples:**
```
# Switch to specific alternate
/altfield field=description name="Description #1"

# Switch to random alternate (omit name)
/altfield field=scenario
```

Both arguments support autocomplete - the `field` argument must be specified for the `name` argument to autocomplete.

## ⚠️ Important Notes

- **Manual saving required**: The extension doesn't auto-save changes when switching alternates
- **Warning system**: Visual alerts and confirmation dialogs protect against losing unsaved work
- **Overwrites current content**: Switching alternates will replace current field content

## Data Storage

Alternate fields are stored in the character card under:
```
extensions.alternate_fields.[field_saveKey]
```

This means data travels with the character card when shared. Delete fields you don't want others seeing before sharing.

## Acknowledgements

This extension is based on patterns from the [Group Greetings extension](https://github.com/SillyTavern/Extension-GroupGreetings) by the SillyTavern team.

## License

Licensed under AGPLv3
