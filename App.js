/* global SillyTavern */
import { useState } from 'react';
import _ from 'lodash';

const {
    eventSource,
    eventTypes,
} = SillyTavern.getContext();

// Utility class for handling character context (adapted from Group Greetings)
class ContextUtil {
    static getCharacterId() {
        const context = SillyTavern.getContext();
        let characterId = context.characterId;
        // When peeking a group chat member, find a proper characterId
        if (context.groupId) {
            const avatarUrlInput = document.getElementById('avatar_url_pole');
            if (avatarUrlInput instanceof HTMLInputElement) {
                const avatarUrl = avatarUrlInput.value;
                characterId = context.characters.findIndex(c => c.avatar === avatarUrl);
            }
        }
        return characterId;
    }

    static getName() {
        const context = SillyTavern.getContext();
        if (context.menuType === 'create') {
            return context.createCharacterData.name || 'Unknown';
        } else {
            const characterId = ContextUtil.getCharacterId();
            return context.characters[characterId]?.data?.name || 'Unknown';
        }
    }

    static getInitialDescriptions() {
        const context = SillyTavern.getContext();
        if (context.menuType === 'create') {
            return _.get(context, 'createCharacterData.extensions.alternate_descriptions', []);
        } else {
            const characterId = ContextUtil.getCharacterId();
            return context.characters[characterId]?.data?.extensions?.alternate_descriptions || [];
        }
    }

    static getCurrentDescription() {
        const textarea = document.getElementById('description_textarea');
        return textarea ? textarea.value : '';
    }

    static setCurrentDescription(description) {
        const textarea = document.getElementById('description_textarea');
        if (textarea) {
            textarea.value = description;
            // Trigger change event so SillyTavern knows the field was updated
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
}

// Main App component (the button)
function App() {
    function handleClick() {
        alert('React button clicked! Ready to add popup.');
    }

    return (
        <div onClick={handleClick} className="menu_button menu_button_icon alt_descriptions_button" title="Manage alternate descriptions">
            <span>Alt. Descriptions</span>
        </div>
    );
}

export default App;