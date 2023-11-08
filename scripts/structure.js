"use strict";

import {
	NotationProgenitor,
	NotationContainer
} from "./modules/storage.js";
import { } from "./modules/extensions.js";

//#region Turing Machine
/** @enum {String} */ const Directions = {
	/** @readonly */ left: `left`,
	/** @readonly */ stay: `stay`,
	/** @readonly */ right: `right`,
};
Object.freeze(Directions);

class Request {
	/**
	 * @param {String} text 
	 */
	static parse(text) {
		const match = /^(-?\d+)\s*\(\s*(\w+)\s*\)$/.exec(text);
		if (match === null) throw new SyntaxError(`Invalid request syntax at part '${text}'`);
		const [, state, value] = match;
		return new Request(Number(state), value);
	}
	/**
	 * @param {Number} state 
	 * @param {String} value 
	 */
	constructor(state, value) {
		this.#state = state;
		this.#value = value;
	}
	/** @type {Number} */ #state;
	/** @readonly */ get state() {
		return this.#state;
	}
	/** @type {String} */ #value;
	/** @readonly */ get value() {
		return this.#value;
	}
	toString() {
		return `${this.state}(${this.value})`;
	}
}

class Response extends Request {
	/**
	 * @param {String} text 
	 */
	static parse(text) {
		const match = /^(-?\d+)\s*\(\s*(\w+)\s*\)\s*([L|S|R])$/.exec(text);
		if (match === null) throw new SyntaxError(`Invalid response syntax at part '${text}'`);
		const [, state, value, move] = match;
		return new Response(Number(state), value, (() => {
			switch (move) {
				case `L`: return Directions.left;
				case `S`: return Directions.stay;
				case `R`: return Directions.right;
				default: throw new TypeError(`Invalid move ${move} type`);
			}
		})());
	}
	/**
	 * @param {Number} state 
	 * @param {String} value 
	 * @param {Directions} move 
	 */
	constructor(state, value, move) {
		super(state, value);
		this.#move = move;
	}
	/** @type {Directions} */ #move;
	/** @readonly */ get move() {
		return this.#move;
	}
	toString() {
		return `${this.state}(${this.value}) ${this.move}`;
	}
}

/**
 * @extends {Map<Request, Response>}
 */
class TuringMap extends Map {
	/**
	 * @param {Request} key 
	 * @returns {Response}
	 */
	get(key) {
		const request = Array.from(this.keys()).find((request) => request.state === key.state && request.value === key.value);
		return (request === undefined) ?
			new Response(key.state, key.value, Directions.stay) :
			super.get(request) ?? (() => { throw new ReferenceError(`Request ${request} is missing`); })();
	}
	/**
	 * @param {Request} key 
	 * @param {Response} value
	 * @returns {this}
	 */
	set(key, value) {
		const request = Array.from(this.keys()).find((request) => request.state === key.state && request.value === key.value) ?? key;
		super.set(request, value);
		return this;
	}
}

/**
 * @extends {Array<String>}
 */
class TapeRecord extends Array {
	/**
	 * @param {String} text 
	 * @returns {[Request, Response]}
	 */
	static parse(text) {
		const match = /^(\S.*\S)\s*=>\s*(\S.*\S)$/.exec(text);
		if (match === null) throw new SyntaxError(`Invalid line syntax at part '${text}'`);
		const [, request, response] = match;
		try {
			return [Request.parse(request), Response.parse(response)];
		} catch (error) {
			// console.log(error);
			throw error;
		}
	}
	/**
	 * @param {Number} index 
	 * @param  {String[]} items 
	 */
	constructor(index, ...items) {
		super(...items);
		this.#index = index;
	}
	/** @type {Number} */ #index;
	/** @readonly */ get index() {
		return this.#index;
	}
	toString() {
		const clone = this.slice();
		clone[this.index] = `<mark>${clone[this.index]}</mark>`;
		return clone.join(` `);
	}
}

class TuringMachine {
	/**
	 * @param {String} initial 
	 */
	constructor(initial) {
		this.#initial = initial;
	}
	/** @type {String} */ #initial;
	/** @type {TuringMap} */ #instructions = new TuringMap();
	/** @readonly */ get instructions() {
		return this.#instructions;
	}
	/**
	 * @param {String[]} tape 
	 * @returns {Generator<TapeRecord, TapeRecord, unknown>}
	 */
	*launch(tape) {
		for (let index = 0, state = 0; true;) {
			const value = tape[index];
			const response = this.instructions.get(new Request(state, value));
			tape[index] = response.value;
			const record = new TapeRecord(index, ...tape);
			state = response.state;
			if (state < 0) {
				return record;
			} else {
				switch (response.move) {
					case Directions.left: {
						index--;
						for (; index < 0; index++) {
							tape.unshift(this.#initial);
						}
					} break;
					case Directions.stay: { } break;
					case Directions.right: {
						index++;
						for (; index >= tape.length;) {
							tape.push(this.#initial);
						}
					} break;
					default: throw new TypeError(`Invalid ${response.move} direction`);
				}
				yield record;
			}
		}
	}
}
//#endregion
//#region Settings
/**
 * @typedef SettingsNotation
 * @property {String} [instructions]
 * @property {String} [tape]
 */

class Settings extends NotationProgenitor {
	/**
	 * @param {SettingsNotation} source 
	 * @returns {Settings}
	 */
	static import(source) {
		const result = new Settings();
		if (!(typeof (source) === `object`)) {
			throw new TypeError(`Source has invalid ${typeof (source)} type`);
		}
		const instructions = Reflect.get(source, `instructions`);
		if (instructions !== undefined) {
			if (!(typeof (instructions) === `string`)) {
				throw new TypeError(`Property instructions has invalid ${typeof (instructions)} type`);
			}
			result.instructions = instructions;
		}
		const tape = Reflect.get(source, `tape`);
		if (tape !== undefined) {
			if (!(typeof (tape) === `string`)) {
				throw new TypeError(`Property tape has invalid ${typeof (tape)} type`);
			}
			result.tape = tape;
		}
		return result;
	}
	/**
	 * @param {Settings} source 
	 * @returns {SettingsNotation}
	 */
	static export(source) {
		const result = (/** @type {SettingsNotation} */ ({}));
		result.instructions = source.instructions;
		result.tape = source.tape;
		return result;
	}
	/** @type {String[]} */ static #themes = [`system`, `light`, `dark`];
	/** @readonly */ static get themes() {
		return Object.freeze(this.#themes);
	}
	/** @type {String} */ #instructions = `0(1) => 0(1) R\n0(sum) => 1(1) L\n1(1) => 1(1) L\n1(0) => 2(0) R\n2(1) => -1(0) S`;
	get instructions() {
		return this.#instructions;
	}
	set instructions(value) {
		this.#instructions = value;
	}
	/** @type {String} */ #tape = `1 1 1 1 1 1 1 1 sum 1 1 1 1`;
	get tape() {
		return this.#tape;
	}
	set tape(value) {
		this.#tape = value;
	}
}
//#endregion
//#region Metadata
const developer = document.getElement(HTMLMetaElement, `meta[name="author"]`).content;
const title = document.getElement(HTMLMetaElement, `meta[name="application-name"]`).content;
const containerSettings = new NotationContainer(Settings, `${developer}.${title}.Settings`);
const settings = containerSettings.content;
const search = location.getSearchMap();
const theme = search.get(`theme`);
if (theme !== undefined && Settings.themes.includes(theme)) {
	document.documentElement.dataset[`theme`] = theme;
}
const reset = search.get(`reset`);
switch (reset) {
	case `settings`: {
		containerSettings.reset();
	}
	default: break;
}
//#endregion

export {
	Directions,
	Request,
	Response,
	TuringMap,
	TapeRecord,
	TuringMachine,
	Settings,
	containerSettings,
	settings,
	search
};