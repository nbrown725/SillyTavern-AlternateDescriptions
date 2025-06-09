/*
 * Alternate Character Fields Extension for SillyTavern
 * Based on patterns from Group Greetings extension
 * Licensed under AGPLv3
 */

console.log('Alternate Character Fields extension loading...');

// Utility functions for handling character context
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
            return context.createCharacterData.extensions?.alternate_descriptions || [];
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

// Save descriptions to character data
function saveDescriptions(descriptions) {
    const context = SillyTavern.getContext();
    if (context.menuType === 'create') {
        if (!context.createCharacterData.extensions) {
            context.createCharacterData.extensions = {};
        }
        context.createCharacterData.extensions.alternate_descriptions = descriptions;
    } else {
        const characterId = ContextUtil.getCharacterId();
        context.writeExtensionField(characterId, 'alternate_descriptions', descriptions);
    }
}

// Check if current description matches any saved descriptions
function checkDescriptionStatus(container, descriptions) {
    const currentDescription = ContextUtil.getCurrentDescription();
    const hasMatch = descriptions.some(desc => desc.trim() === currentDescription.trim());

    // Find or create status indicator
    let statusIndicator = container.querySelector('#description-status');
    if (!statusIndicator) {
        statusIndicator = document.createElement('div');
        statusIndicator.id = 'description-status';
        statusIndicator.style.cssText = `
            margin: 10px 0; 
            padding: 8px 12px; 
            border-radius: 4px; 
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        // Insert after the instructions
        const hr = container.querySelectorAll('hr')[1];
        hr.parentNode.insertBefore(statusIndicator, hr.nextSibling);
    }

    if (!hasMatch && currentDescription.trim()) {
        // Current description has been edited
        statusIndicator.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
        statusIndicator.style.borderLeft = '3px solid #ffc107';
        statusIndicator.style.color = '#856404';
        statusIndicator.innerHTML = `
            <i class="fa-solid fa-exclamation-triangle"></i>
            <span>Current description has been modified and doesn't match any saved version.</span>
            <div class="menu_button menu_button_icon" id="save-current-btn" style="margin-left: auto; font-size: 12px; padding: 4px 8px;">
                <i class="fa-solid fa-save"></i>
                <span>Save Current</span>
            </div>
        `;

        // Add click handler for the save button
        statusIndicator.querySelector('#save-current-btn').addEventListener('click', () => {
            descriptions.push(currentDescription);
            saveDescriptions(descriptions);
            updateDescriptionsList(container, descriptions);
            checkDescriptionStatus(container, descriptions);
        });

    } else if (hasMatch) {
        // Current description matches a saved version
        statusIndicator.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
        statusIndicator.style.borderLeft = '3px solid #28a745';
        statusIndicator.style.color = '#155724';
        statusIndicator.innerHTML = `
            <i class="fa-solid fa-check-circle"></i>
            <span>Current description matches a saved version.</span>
        `;
    } else {
        // No current description
        statusIndicator.style.display = 'none';
    }
}

// Smart update of active indicators without re-rendering entire list
function updateActiveIndicators(container, descriptions) {
    const currentDescription = ContextUtil.getCurrentDescription();
    const listContainer = container.querySelector('#descriptions-list');

    descriptions.forEach((desc, index) => {
        const isActive = desc.trim() === currentDescription.trim();
        const descItem = listContainer.querySelector(`[data-item-index="${index}"]`);

        if (descItem) {
            const header = descItem.querySelector('h4');
            const useBtn = descItem.querySelector('.use-desc-btn');

            // Update active class and styling
            if (isActive) {
                descItem.classList.add('active-description');
                useBtn.style.opacity = '0.5';
                useBtn.title = 'Already active';

                // Add checkmark if not present
                if (!header.querySelector('.fa-check-circle')) {
                    header.innerHTML = `Description #${index + 1} <i class="fa-solid fa-check-circle" style="color: #28a745; margin-left: 8px;"></i>`;
                }
            } else {
                descItem.classList.remove('active-description');
                useBtn.style.opacity = '';
                useBtn.title = '';

                // Remove checkmark
                header.innerHTML = `Description #${index + 1}`;
            }
        }
    });

    // Update the status indicator
    checkDescriptionStatus(container, descriptions);
}

// Check if description already exists
function descriptionExists(descriptions, newDescription) {
    return descriptions.some(desc => desc.trim() === newDescription.trim());
}

// Update the descriptions list in the popup
function updateDescriptionsList(container, descriptions) {
    const listContainer = container.querySelector('#descriptions-list');
    const currentDescription = ContextUtil.getCurrentDescription();

    if (descriptions.length === 0) {
        listContainer.innerHTML = '<strong>Click <i class="fa-solid fa-plus"></i> to save the current description</strong>';
        return;
    }

    listContainer.innerHTML = descriptions.map((desc, index) => {
        const isActive = desc.trim() === currentDescription.trim();
        const activeClass = isActive ? 'active-description' : '';
        const activeIndicator = isActive ? '<i class="fa-solid fa-check-circle" style="color: #28a745; margin-left: 8px;"></i>' : '';

        return `
            <div class="description-item ${activeClass}" data-item-index="${index}" style="margin-bottom: 15px;">
                <div class="flex-container justifySpaceBetween">
                    <h4>Description #${index + 1} ${activeIndicator}</h4>
                    <div class="flex-container">
                        <div class="menu_button menu_button_icon use-desc-btn" data-index="${index}" ${isActive ? 'style="opacity: 0.5;" title="Already active"' : ''}>
                            <i class="fa-solid fa-arrow-up"></i>
                            <span>Use</span>
                        </div>
                        <div class="menu_button menu_button_icon delete-desc-btn" data-index="${index}">
                            <i class="fa-solid fa-trash"></i>
                            <span>Delete</span>
                        </div>
                    </div>
                </div>
                <textarea class="text_pole textarea_compact desc-textarea" rows="8" data-index="${index}" placeholder="Character description...">${desc}</textarea>
            </div>
        `;
    }).join('');

    // Add event listeners
    listContainer.querySelectorAll('.use-desc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            ContextUtil.setCurrentDescription(descriptions[index]);
            updateActiveIndicators(container, descriptions);
        });
    });

    listContainer.querySelectorAll('.delete-desc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            descriptions.splice(index, 1);
            saveDescriptions(descriptions);
            updateDescriptionsList(container, descriptions);
        });
    });

    listContainer.querySelectorAll('.desc-textarea').forEach(textarea => {
        textarea.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index);
            descriptions[index] = e.target.value;
            saveDescriptions(descriptions);

            // Update active indicators without re-rendering
            setTimeout(() => updateActiveIndicators(container, descriptions), 50);
        });
    });
}

// Monitor the main description textarea for changes
function setupDescriptionMonitoring(container, descriptions) {
    const mainTextarea = document.getElementById('description_textarea');
    if (mainTextarea) {
        checkDescriptionStatus(container, descriptions);

        const checkStatus = () => {
            setTimeout(() => {
                updateActiveIndicators(container, descriptions);
            }, 50);
        };

        mainTextarea.addEventListener('input', checkStatus);
        mainTextarea.addEventListener('paste', checkStatus);

        // Cleanup when popup closes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && !document.contains(container)) {
                    mainTextarea.removeEventListener('input', checkStatus);
                    mainTextarea.removeEventListener('paste', checkStatus);
                    observer.disconnect();
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
}

// Create the popup content
function createPopupContent() {
    let descriptions = ContextUtil.getInitialDescriptions();
    const characterName = ContextUtil.getName();
    const currentDescription = ContextUtil.getCurrentDescription();

    // AUTO-SAVE: If this is the first time opening and there's a current description
    if (descriptions.length === 0 && currentDescription.trim()) {
        descriptions = [currentDescription];
        saveDescriptions(descriptions);
        console.log('Auto-saved current description on first open');
    }

    const container = document.createElement('div');
    container.className = 'flex-container flexFlowColumn';

    container.innerHTML = `
        <div class="flex-container justifySpaceBetween alignItemsCenter">
            <h3 class="margin0">Alternate descriptions for <span>${characterName}</span></h3>
            <div id="add-description-btn" class="menu_button menu_button_icon">
                <i class="fa-solid fa-plus"></i>
                <span>Add Current</span>
            </div>
        </div>
        <hr>
        <div class="justifyLeft">
            <small>
                Save different versions of your character's description. Click "Use" to switch the active description in the editor.
                ${descriptions.length === 1 && descriptions[0] === currentDescription ?
            '<br><strong>💾 Your original description has been automatically saved!</strong>' : ''
        }
            </small>
        </div>
        <hr>
        <div id="descriptions-list"></div>
    `;

    // Add event listener for "Add Current" button with duplicate check
    container.querySelector('#add-description-btn').addEventListener('click', () => {
        const currentDesc = ContextUtil.getCurrentDescription();

        // Check if this description already exists
        if (descriptionExists(descriptions, currentDesc)) {
            // Show temporary message
            const btn = container.querySelector('#add-description-btn');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-info-circle"></i><span>Already exists</span>';
            btn.style.opacity = '0.6';
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.style.opacity = '';
            }, 1500);
            return;
        }

        descriptions.push(currentDesc || '');
        saveDescriptions(descriptions);
        updateDescriptionsList(container, descriptions);
    });

    // Initial render
    updateDescriptionsList(container, descriptions);

    // Setup real-time monitoring of main textarea
    setupDescriptionMonitoring(container, descriptions);

    return container;
}

// Create and inject our button
function createAltDescriptionButton() {
    const button = document.createElement('div');
    button.className = 'menu_button menu_button_icon alt_descriptions_button';
    button.title = 'Manage alternate descriptions';
    button.innerHTML = '<span>Alt. Descriptions</span>';

    // Handle button click - open the popup
    button.addEventListener('click', () => {
        const context = SillyTavern.getContext();
        const popupContent = createPopupContent();
        context.callPopup(popupContent, 'text', '', { wide: true, large: true });
    });

    return button;
}

// Wait for the DOM to be ready
function waitForElement(selector, callback) {
    const element = document.querySelector(selector);
    if (element) {
        callback(element);
    } else {
        setTimeout(() => waitForElement(selector, callback), 100);
    }
}

// Inject the button into the description area
function injectButton() {
    waitForElement('#description_div', (descriptionDiv) => {
        // Find the external media button
        const externalMediaButton = descriptionDiv.querySelector('#character_open_media_overrides');

        if (externalMediaButton) {
            // Create our button
            const altDescButton = createAltDescriptionButton();

            // Insert it right after the external media button
            externalMediaButton.parentNode.insertBefore(altDescButton, externalMediaButton.nextSibling);

            console.log('Alt Descriptions button injected successfully!');
        } else {
            console.log('Could not find external media button to inject after');
        }
    });
}

// Initialize the extension
injectButton();