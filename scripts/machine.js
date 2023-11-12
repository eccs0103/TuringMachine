"use strict";

import {
	PreciseEngine
} from "./modules/executors.js";
import {
	Factory,
	TapeRecord,
	TuringMachine,
	experimental,
	settings
} from "./structure.js";

void async function () {
	try {
		//#region Definition
		const textareaInstructionsField = document.getElement(HTMLTextAreaElement, `textarea#instructions-field`);
		const inputTapeField = document.getElement(HTMLInputElement, `input#tape-field`);
		const divLogsField = document.getElement(HTMLDivElement, `div#logs-field`);
		const inputToggleCompile = document.getElement(HTMLInputElement, `input#toggle-compile`);
		const inputToggleAutoLog = document.getElement(HTMLInputElement, `input#toggle-auto-log`);
		const buttonToggleLog = document.getElement(HTMLButtonElement, `button#next-log`);
		const buttonSkipLogs = document.getElement(HTMLButtonElement, `button#skip-logs`);
		const inputStatusBar = document.getElement(HTMLInputElement, `input#status-bar`);

		const machine = new TuringMachine(`0`);
		const engine = new PreciseEngine();
		engine.FPS = (1000 / 500);
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
		/** @type {Factory<TapeRecord>?} */ let factory = null;

		/**
		 * @param {TapeRecord} record 
		 */
		function print(record) {
			divLogsField.innerHTML += `${record}<br>`;
			divLogsField.scrollTo({ top: divLogsField.scrollHeight });
			inputStatusBar.value = `state: ${record.request.state}, value: ${record.request.value}`;
		}

		function clear() {
			divLogsField.innerHTML = ``;
			divLogsField.scrollTo({ top: 0 });
			inputStatusBar.value = ``;
		}

		inputToggleCompile.addEventListener(`click`, async (event) => {
			try {
				inputToggleCompile.disabled = true;
				if (inputToggleCompile.checked) {
					const repetitions = [];
					const generator = await window.load(/** @type {Promise<Generator<TapeRecord>>} */(new Promise((resolve) => {
						const code = textareaInstructionsField.value;
						const lines = code.split(`\n`);
						for (const line of lines.filter(line => line)) {
							const [request, response] = TapeRecord.parse(line);
							if (machine.instructions.has(request)) {
								repetitions.push(request);
							}
							machine.instructions.set(request, response);
						}
						const tape = inputTapeField.value.split(/\s+/);
						resolve(machine.compile(tape));
					})), 200, 600);
					if (repetitions.length > 0) {
						await window.alertAsync(`The instructions with requests \n${repetitions.map(request => `• ${request}`).join(`\n`)}\n already exist. All repetitions in the group, except the last one, will be overwritten.`, `Warning`);
					}
					factory = new Factory(generator);
					factory.produce().then(record => print(record), () => { });
					engine.launched = true;
				} else {
					machine.instructions.clear();
					factory = null;
					clear();
					engine.launched = false;
				}
				inputToggleCompile.disabled = false;
			} catch (error) {
				document.prevent(document.analysis(error));
			}
		});

		buttonToggleLog.addEventListener(`click`, async (event) => {
			if (factory !== null) factory.produce().then(record => print(record), () => { });
		});

		inputToggleAutoLog.checked = settings.auto;
		inputToggleAutoLog.addEventListener(`change`, (event) => {
			settings.auto = inputToggleAutoLog.checked;
		});
		engine.addEventListener(`render`, (event) => {
			if (inputToggleAutoLog.checked && factory !== null) {
				factory.produce().then(record => print(record), () => { });
			}
		});

		buttonSkipLogs.hidden = !experimental;
		buttonSkipLogs.addEventListener(`click`, async (event) => {
			if (factory !== null) {
				while (true) {
					try {
						print(await factory.produce());
					} catch {
						break;
					}
				}
			}
		});
		//#endregion
	} catch (error) {
		document.prevent(document.analysis(error));
	}
}();