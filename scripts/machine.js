"use strict";

import {
	TapeRecord,
	TuringMachine,
	TuringMap,
	settings
} from "./structure.js";

void async function () {
	try {
		//#region Definition
		const textareaInstructionsField = document.getElement(HTMLTextAreaElement, `textarea#instructions-field`);
		const inputTapeField = document.getElement(HTMLInputElement, `input#tape-field`);
		const divLogsField = document.getElement(HTMLDivElement, `div#logs-field`);
		const inputToggleCompile = document.getElement(HTMLInputElement, `input#toggle-compile`);
		const buttonToggleLog = document.getElement(HTMLButtonElement, `button#toggle-log`);

		const machine = new TuringMachine(`0`);
		//#endregion
		//#region Input
		textareaInstructionsField.value = settings.instructions;
		textareaInstructionsField.addEventListener(`change`, (event) => {
			settings.instructions = textareaInstructionsField.value;
		});

		inputTapeField.value = settings.tape;
		inputTapeField.addEventListener(`change`, (event) => {
			settings.tape = inputTapeField.value;
		});
		//#endregion
		//#region Output
		/** @type {Generator<TapeRecord, TapeRecord, unknown>?} */ let generator = null;
		inputToggleCompile.addEventListener(`change`, async (event) => {
			try {
				inputToggleCompile.disabled = true;
				if (inputToggleCompile.checked) {
					await window.load(new Promise((resolve) => {
						const code = textareaInstructionsField.value;
						const lines = code.split(`\n`);
						for (const line of lines) {
							const [request, response] = TapeRecord.parse(line);
							machine.instructions.set(request, response);
						}
						generator = machine.launch(inputTapeField.value.split(/\s+/));
						resolve(undefined);
					}), 200, 600);
				} else {
					machine.instructions.clear();
					divLogsField.replaceChildren();
					generator = null;
					done = false;
				}
				inputToggleCompile.disabled = false;
			} catch (error) {
				document.prevent(document.analysis(error));
			}
		});

		let done = false;
		buttonToggleLog.addEventListener(`click`, (event) => {
			try {
				if (generator !== null) {
					const generation = generator.next();
					if (!done) {
						const record = generation.value;
						divLogsField.innerHTML += `${record}<br>`;
					}
					done = generation.done ?? true;
				}
			} catch (error) {
				document.prevent(document.analysis(error));
			}
		});
		//#endregion
	} catch (error) {
		document.prevent(document.analysis(error));
	}
}();