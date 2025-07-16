/*
 * Alternate Character Descriptions Extension for SillyTavern
 * Based on patterns from Group Greetings extension
 * Licensed under AGPLv3
 */

import { SlashCommand } from "../../../slash-commands/SlashCommand.js";
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { ARGUMENT_TYPE, SlashCommandNamedArgument } from '../../../slash-commands/SlashCommandArgument.js';
import { SlashCommandEnumValue, enumTypes } from '../../../slash-commands/SlashCommandEnumValue.js';

const fieldConfigs = [
    {
        field: 'description',
        button_name: 'Descriptions',
        selector: '#description_div',
        inject_point: '#character_open_media_overrides',
        textarea: 'description_textarea',
        saveKey: 'alt_descriptions',
    },
    {
        field: 'personality',
        button_name: 'Personalities',
        selector: '#personality_div',
        inject_point: '.notes-link',
        textarea: 'personality_textarea',
        saveKey: 'alt_personalities',
    },
    {
        field: 'scenario',
        button_name: 'Scenarios',
        selector: '#scenario_div',
        inject_point: '.notes-link',
        textarea: 'scenario_pole',
        saveKey: 'alt_scenarios',
    },
    {
        field: 'example dialogue',
        button_name: 'Example Dialogue',
        selector: '#mes_example_div',
        inject_point: '.editor_maximize',
        textarea: 'mes_example_textarea',
        saveKey: 'alt_example_dialogue',
    },
    {
        field: 'main prompt',
        button_name: 'Main Prompts',
        selector: '#system_prompt_textarea',
        inject_point: '.editor_maximize',
        textarea: 'system_prompt_textarea',
        saveKey: 'alt_main_prompts',
    },
    {
        field: 'post-history instructions',
        button_name: 'Post-History Instructions',
        selector: '#post_history_instructions_textarea',
        inject_point: '.editor_maximize',
        textarea: 'post_history_instructions_textarea',
        saveKey: 'alt_post_history',
    }
]

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

    // Migrates alternate description array elements from string to { title: string, description: string } object.
    static migrateDescriptions() {
        const context = SillyTavern.getContext();

        if (context.menuType !== "create") {
            const characterId = ContextUtil.getCharacterId();
            let desc = context.characters[characterId]?.data?.extensions?.alternate_descriptions;

            if (desc) {
                if (desc.length !== 0) {

                    // If alternate_description is of old 0.1.0 type String, convert to object {title: String, content: String}
                    if (typeof (desc[0]) === "string") {
                        desc = desc.map((description, index) => ({ title: `Description #${index + 1}`, content: description }));

                    // If alternate_description is of newer 0.2.0 type object, rename 'description' property to 'content'
                    } else if (desc[0].description) {
                        desc = desc.map(item => ({
                            title: item.title,
                            content: item.description
                        }));
                    }

                    // Save field data with with description config
                    saveFieldData(fieldConfigs[0], desc);

                    // Delete the old property
                    delete context.characters[characterId].data.extensions.alternate_descriptions;
                    context.writeExtensionField(characterId, 'alternate_descriptions', undefined);

                    console.log("Migration Complete");
                }
            }
        }
    }

    static getFieldData(field) {
        this.migrateDescriptions();
        const context = SillyTavern.getContext();
        if (context.menuType === 'create') {
            return context.createCharacterData.extensions?.alternate_fields?.[field.saveKey] || [];
        } else {
            const characterId = ContextUtil.getCharacterId();
            return context.characters[characterId]?.data?.extensions?.alternate_fields?.[field.saveKey] || [];
        }
    }

    static getCurrentField(field) {
        const textarea = document.getElementById(field.textarea);
        return textarea ? textarea.value : '';
    }

    static setCurrentField(field, entry) {
        const textarea = document.getElementById(field.textarea);
        if (textarea) {
            textarea.value = entry;
            // Trigger change event so SillyTavern knows the field was updated
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
}

// Save descriptions to character data
function saveFieldData(field, fieldData) {
    const context = SillyTavern.getContext();

    if (context.menuType === 'create') {
        if (!context.createCharacterData.extensions) {
            context.createCharacterData.extensions = {};
        }

        if (!context.createCharacterData.extensions.alternate_fields) {
            context.createCharacterData.extensions.alternate_fields = {};
        }
        context.createCharacterData.extensions.alternate_fields[field.saveKey] = fieldData;
    } else {
        const characterId = ContextUtil.getCharacterId();
        const character = context.characters[characterId];

        // Handle nesting manually
        if (!character.data.extensions) {
            character.data.extensions = {};
        }
        
        if (!character.data.extensions.alternate_fields) {
            character.data.extensions.alternate_fields = {};
        }
        character.data.extensions.alternate_fields[field.saveKey] = fieldData;

        // Save the entire alternate_fields object
        context.writeExtensionField(characterId, 'alternate_fields', character.data.extensions.alternate_fields);
    }
}

// Check if current description matches any saved descriptions
function checkFieldStatus(container, field, fieldData) {
    const currentFieldEntry = ContextUtil.getCurrentField(field);
    const hasMatch = fieldData.some(entry => entry.content.trim() === currentFieldEntry.trim());

    // Find or create status indicator
    let statusIndicator = container.querySelector('#field-status');
    if (!statusIndicator) {
        statusIndicator = document.createElement('div');
        statusIndicator.id = 'field-status';
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

    if (!hasMatch && currentFieldEntry.trim()) {
        // Current description has been edited
        statusIndicator.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
        statusIndicator.style.borderLeft = '3px solid #ffc107';
        statusIndicator.style.color = '#856404';
        statusIndicator.innerHTML = `
            <i class="fa-solid fa-exclamation-triangle"></i>
            <span>Current ${field.field} has been modified and doesn't match any saved version.</span>
            <div class="menu_button menu_button_icon" id="save-current-btn" style="margin-left: auto; font-size: 12px; padding: 4px 8px;">
                <i class="fa-solid fa-save"></i>
                <span>Save Current</span>
            </div>
        `;

        // Add click handler for the save button
        statusIndicator.querySelector('#save-current-btn').addEventListener('click', () => {
            fieldData.push( {title: `${field.field} #${fieldData.length+1}`, content: currentFieldEntry });
            saveFieldData(field, fieldData);
            updateFieldList(container, field, fieldData);
            checkFieldStatus(container, field, fieldData);
        });

    } else if (hasMatch) {
        // Current description matches a saved version
        statusIndicator.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
        statusIndicator.style.borderLeft = '3px solid #28a745';
        statusIndicator.style.color = '#155724';
        statusIndicator.innerHTML = `
            <i class="fa-solid fa-check-circle"></i>
            <span>Current ${field.field} matches a saved version.</span>
        `;
    } else {
        // No current description
        statusIndicator.style.display = 'none';
    }
}

// Smart update of active indicators without re-rendering entire list
function updateActiveIndicators(container, field, fieldData) {
    const currentFieldEntry = ContextUtil.getCurrentField(field);
    const listContainer = container.querySelector('#field-list');

    fieldData.forEach((entry, index) => {
        const isActive = entry.content.trim() === currentFieldEntry.trim();
        const entryItem = listContainer.querySelector(`[data-item-index="${index}"]`);

        if (entryItem) {
            const activeIndicator = entryItem.querySelector('.active-indicator');
            const useBtn = entryItem.querySelector(`.use-field-btn`);

            // Update active class and styling
            if (isActive) {
                entryItem.classList.add('active-field');
                useBtn.style.opacity = '0.5';
                useBtn.title = 'Already active';
                activeIndicator.innerHTML = `<i class="fa-solid fa-check-circle" style="color: #28a745; margin-left: 8px;"></i>`;
            } else {
                entryItem.classList.remove('active-field');
                useBtn.style.opacity = '';
                useBtn.title = '';
                activeIndicator.innerHTML = '';
            }
        }
    });

    // Update the status indicator
    checkFieldStatus(container, field, fieldData);
}

const saveTimeouts = {};

// Update the descriptions list in the popup
function updateFieldList(container, field, fieldData) {
    const listContainer = container.querySelector('#field-list');
    const currentFieldEntry = ContextUtil.getCurrentField(field);
    const context = SillyTavern.getContext();
    const getTokenCount = context.getTokenCountAsync;

    if (fieldData.length === 0) {
        listContainer.innerHTML = `<strong>Click <i class="fa-solid fa-plus"></i> to save the current ${field.field}</strong>`;
        return;
    }

    listContainer.innerHTML = fieldData.map((entry, index) => {
        const isActive = entry.content.trim() === currentFieldEntry.trim();
        const activeClass = isActive ? 'active-field' : '';
        const activeIndicator = isActive ? '<i class="fa-solid fa-check-circle" style="color: #28a745; margin-left: 8px;"></i>' : '';

        return `
            <div class="field-item ${activeClass}" data-item-index="${index}" style="margin-bottom: 15px;">
                <div class="flex-container justifySpaceBetween">
                    <div class="flex-container" style="width: 40%">
                        <input class="text_pole textarea_compact field-title margin0" data-index="${index}" value="${entry.title}" placeholder="${field.field} title" maxlength="50">
                        <div class="active-indicator">${activeIndicator}</div>
                    </div>
                    <div class="flex-container" style="flex: none;">
                        <div class="menu_button menu_button_icon use-field-btn" data-index="${index}" ${isActive ? 'style="opacity: 0.5;" title="Already active"' : ''}>
                            <i class="fa-solid fa-arrow-up"></i>
                            <span>Use</span>
                        </div>
                        <div class="menu_button menu_button_icon delete-field-btn" data-index="${index}">
                            <i class="fa-solid fa-trash"></i>
                            <span>Delete</span>
                        </div>
                    </div>
                </div>
                <textarea class="text_pole textarea_compact field-textarea" rows="8" data-index="${index}" placeholder="${field.field}...">${entry.content}</textarea>
                <div class="extension_token_counter" style="text-align: right; margin-top: 5px;">
                    <span>Tokens:</span> <span data-token-display="${index}">calculating...</span>
                </div>
            </div>
        `;
    }).join('');

    // Calculate initial token counts
    fieldData.forEach(async (entry, index) => {
        const context = SillyTavern.getContext();
        const tokenCount = await context.getTokenCountAsync(entry.content);

        const tokenDisplay = container.querySelector(`[data-token-display="${index}"]`);
        if (tokenDisplay) {
            tokenDisplay.textContent = tokenCount;
        }
    });

    // Add event listeners
    listContainer.querySelectorAll('.use-field-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            const currentFieldEntry = ContextUtil.getCurrentField(field);
            const hasUnsavedChanges = !fieldData.some(entry => entry.content.trim() === currentFieldEntry.trim()) && currentFieldEntry.trim();

            if (hasUnsavedChanges) {
                // Show simple confirmation dialog
                const confirmed = confirm(`Your current ${field.field} has unsaved changes. Switch to this ${field.field} anyway?`);

                if (confirmed) {
                    ContextUtil.setCurrentField(field, fieldData[index].content);
                    updateActiveIndicators(container, field, fieldData);
                }
                // If not confirmed, do nothing
            } else {
                // No unsaved changes, switch directly
                ContextUtil.setCurrentField(field, fieldData[index].content);
                updateActiveIndicators(container, field, fieldData);
            }
        });
    });

    listContainer.querySelectorAll('.delete-field-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);

            // Show confirmation dialog before deleting
            const confirmed = confirm(`Are you sure you want to delete ${fieldData[index].title}? This action cannot be undone.`);

            if (confirmed) {
                fieldData.splice(index, 1);
                saveFieldData(field, fieldData);
                updateFieldList(container, field, fieldData);
            }
            // If not confirmed, do nothing
        });
    });

    listContainer.querySelectorAll('.field-textarea').forEach(textarea => {
        textarea.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index);
            fieldData[index].content = e.target.value;  // ← Still immediate

            // Immediate UI update (responsive feel)
            setTimeout(() => updateActiveIndicators(container, field, fieldData), 50);

            // Debounced save (performance)
            if (saveTimeouts[index]) {
                clearTimeout(saveTimeouts[index]);
            }
            saveTimeouts[index] = setTimeout(async () => {
                saveFieldData(field, fieldData);
                
                const tokenCount = await getTokenCount(fieldData[index].content);

                const tokenDisplay = container.querySelector(`[data-token-display="${index}"]`);
                if (tokenDisplay) {
                    tokenDisplay.textContent = tokenCount;
                }

            }, 500);
        });
    });

    listContainer.querySelectorAll('.field-title').forEach(titleInput => {
        titleInput.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index);
            fieldData[index].title = e.target.value;

            if (saveTimeouts[index]) {
                clearTimeout(saveTimeouts[index]);
            }
            saveTimeouts[index] = setTimeout(() => {
                saveFieldData(field, fieldData);
                // Token counting here
            }, 500);
        });
    });
}

// Monitor the main description textarea for changes
function setupFieldMonitoring(container, field, fieldData) {
    const mainTextarea = document.getElementById(field.textarea);
    if (mainTextarea) {
        checkFieldStatus(container, field, fieldData);

        const checkStatus = () => {
            setTimeout(() => {
                updateActiveIndicators(container, field, fieldData);
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
function createPopupContent(field) {
    const characterName = ContextUtil.getName();
    let fieldData = ContextUtil.getFieldData(field);
    let currentFieldEntry = ContextUtil.getCurrentField(field);

    // AUTO-SAVE: If this is the first time opening and there's a current description
    if (fieldData.length === 0 && currentFieldEntry.trim()) {
        fieldData = [{ title: `${field.field} #1`, content: currentFieldEntry }];
        saveFieldData(field, fieldData);
    }

    const container = document.createElement('div');
    container.className = 'flex-container flexFlowColumn';  

    container.innerHTML = `
        <div class="flex-container justifySpaceBetween alignItemsCenter">
            <h3 class="margin0">Alternate ${field.button_name} for <span>${characterName}</span></h3>
            <div id="add-field-btn" class="menu_button menu_button_icon">
                <i class="fa-solid fa-plus"></i>
                <span>Add New</span>
            </div>
        </div>
        <hr>
        <div class="justifyLeft">
            <small>
                Save different versions of your character's ${field.field}. Click "Use" to switch the active ${field.field} in the editor.
                ${fieldData.length === 1 && fieldData[0].content === currentFieldEntry ?
            `<br><strong>💾 Your original ${field.field} has been automatically saved!</strong>` : ''
        }
            </small>
        </div>
        <hr>
        <div id="field-list"></div>
    `;

    // Add event listener for "Add New" button with duplicate check
    container.querySelector(`#add-field-btn`).addEventListener('click', () => {
        currentFieldEntry = ContextUtil.getCurrentField(field);
        fieldData.push(currentFieldEntry ? { title: `${field.field} #${fieldData.length + 1}`, content: currentFieldEntry } : { title: `${field.field} #${fieldData.length+1}`, content: ''});
        saveFieldData(field, fieldData);
        updateFieldList(container, field, fieldData);
    });

    // Initial render
    updateFieldList(container, field, fieldData);

    // Setup real-time monitoring of main textarea
    setupFieldMonitoring(container, field, fieldData);

    return container;
}

// Create field button
function createButton(field) {
    const button = document.createElement('div');
    button.className = `menu_button menu_button_icon alt_${field.saveKey}_button alt_fields_button`;
    button.title = `Manage alternate ${field.field}s`;
    button.innerHTML = `<i class="fa-solid fa-bars-staggered"></i><span>Alt. ${field.button_name}</span>`;

    // Handle button click - open the popup
    button.addEventListener('click', () => {
        const context = SillyTavern.getContext();
        const popupContent = createPopupContent(field);
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

// Inject buttons into the field area
function injectButtons() {
    fieldConfigs.forEach(field => {
        if (field.selector.startsWith('#') && field.selector.includes('textarea')) {
            // Handle textarea-based selectors
            waitForElement(field.selector, (textarea) => {
                const fieldButton = createButton(field);
                const parentDiv = textarea.closest('div');
                const injectElem = parentDiv.querySelector(field.inject_point);
                if (injectElem) {
                    injectElem.parentNode.insertBefore(fieldButton, injectElem.nextSibling);
                }
            });
        } else {
            // Handle div-based selectors
            waitForElement(field.selector, (fieldDiv) => {
                const fieldButton = createButton(field);
                const injectElem = fieldDiv.querySelector(field.inject_point);
                if (injectElem) {
                    injectElem.parentNode.insertBefore(fieldButton, injectElem.nextSibling);
                }
            });
        }
    });
}

// Register slash command to switch field entry
function registerSlashCommand() {

    // Enum provider for field types
    const fieldEnumProvider = () => {
        return fieldConfigs.map(field =>
            new SlashCommandEnumValue(
                field.field, // field name
                field.button_name, // field name plural
                enumTypes.name, // field type
            )
        );
    };

    // Enum provider for field names
    const fieldNameEnumProvider = (executor) => {
        // Get the current value of the field argument
        const fieldValue = executor.namedArgumentList.find(x => x.name === 'field')?.value;

        // return empty if no field is specified
        if (!fieldValue) {
            return []; // No field specified yet
        }

        // Get field config for fieldValue. Return empty if fieldConfig cannot be found
        const fieldConfig = fieldConfigs.find(f => f.field === fieldValue);
        if (!fieldConfig) {
            return []; // Invalid field
        }

        // Get the field data
        const fieldData = ContextUtil.getFieldData(fieldConfig);

        // Return enum values for each alternate entry
        return fieldData.map(entry =>
            new SlashCommandEnumValue(
                entry.title, // field name
                entry.content.substring(0, 50) + (entry.content.length > 50 ? '...' : ''), // field preview. First 50 characters.
                enumTypes.name, // field type
            )
        );
    };

    // Register the slash command
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'altfield',
        callback: altFieldCallback,
        helpString: `
        <div>
        Switch to an alternate field entry. Must have a character selected.
        </div>
        <div>
        <strong style="color: rgb(255, 193, 7)">WARNING:</strong> Will overwrite current field without saving it.   
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code>/altfield field=description name="Description #1"</code></pre>
                    Changes the description field to the alternate entry titled "Description #1"
                </li>
            </ul>
        </div>`,
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'field',
                description: 'Field type to switch (description, personality, etc.)',
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: true,
                enumProvider: fieldEnumProvider,
                forceEnum: true
            }),
            SlashCommandNamedArgument.fromProps({
                name: 'name',
                description: 'The name of the saved alternate to switch to',
                typeList: [ARGUMENT_TYPE.STRING],
                enumProvider: fieldNameEnumProvider
            })
        ],
        returns: ARGUMENT_TYPE.STRING
    }));
}

// Callback function that executes the command
function altFieldCallback(namedArguments) {
    const { field, name } = namedArguments;

    try {
        // Get field config for field arg. Return error if field is invalid.
        const fieldConfig = fieldConfigs.find(f => f.field === field);
        if (!fieldConfig) {
            return `Error: Unknown field "${field}". Available fields: ${fieldConfigs.map(f => f.field).join(', ')}`;
        }

        // Get the field data. Return empty string if no entries found
        const fieldData = ContextUtil.getFieldData(fieldConfig);

        if (fieldData.length === 0) {
            return `Error: No field enteries found for ${field}`;
        }

        let alternate;

        // If name is provided, find the specific alternate. Else return random
        if (name && name.trim()) {
            alternate = fieldData.find(entry => entry.title === name);
            if (!alternate) {
                const availableNames = fieldData.map(entry => entry.title);
                return `Error: No alternate named "${name}" found for ${field}. Available: ${availableNames.join(', ')}`;
            }
        } else {
            // If name is blank, choose a random alternate
            const randomIndex = Math.floor(Math.random() * fieldData.length);
            alternate = fieldData[randomIndex];
        }

        // Switch to the alternate
        ContextUtil.setCurrentField(fieldConfig, alternate.content);

        // return switched description
        return alternate.content;

    } catch (error) {
        console.error('Error in altfield command:', error);
        return `Error: ${error.message}`;
    }
}

// Initialize the extension
injectButtons();
registerSlashCommand();