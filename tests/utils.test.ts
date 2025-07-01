import { Response } from 'express';
import mongoose from 'mongoose';
import { checkParameters, checkPinCode, hashPasword } from '../tools/utils';
jest.mock('mongoose');
const log = jest.fn();

(global as any).log = log;

describe('checkParameters', () => {
	let res: Partial<Response>;

	beforeEach(() => {
		const mockReq = { hostname: 'localhost' } as unknown as import('express').Request;
		res = {
			status: jest.fn().mockReturnThis(),
			send: jest.fn(),
			req: mockReq
		};
		log.mockClear();
	});

	it('returns false if body is empty', () => {
		const result = checkParameters({}, res as Response, [['name', 'string']], 'TEST');
		expect(result).toBe(false);
		expect(res.status).toHaveBeenCalledWith(400);
		expect((res.send as jest.Mock).mock.calls[0][0].message).toMatch(/Missing parameters body is empty/);
	});

	it('returns false if a required parameter is missing', () => {
		const result = checkParameters({ age: 30 }, res as Response, [['name', 'string']], 'TEST');
		expect(result).toBe(false);
		expect(res.status).toHaveBeenCalledWith(400);
		expect((res.send as jest.Mock).mock.calls[0][0].message).toMatch(/Missing parameters/);
	});

	it('returns true if optional parameter is missing', () => {
		const result = checkParameters({ age: 30 }, res as Response, [['name', 'string', true]], 'TEST');
		expect(result).toBe(true);
	});

	it('returns false if parameter has wrong type', () => {
		const result = checkParameters({ name: 123 }, res as Response, [['name', 'string']], 'TEST');
		expect(result).toBe(false);
		expect((res.send as jest.Mock).mock.calls[0][0].message).toMatch(/Wrong type/);
	});

	it('returns false if ObjectId is invalid format', () => {
		(mongoose.isValidObjectId as jest.Mock).mockReturnValue(false);
		const result = checkParameters(
			{ id: '123456789012345678901234' },
			res as Response,
			[['id', 'ObjectId']],
			'TEST'
		);
		expect(result).toBe(false);
		expect((res.send as jest.Mock).mock.calls[0][0].message).toMatch(/Wrong type/);
	});

	it('returns false if ObjectId length is wrong', () => {
		const result = checkParameters({ id: '123' }, res as Response, [['id', 'ObjectId']], 'TEST');
		expect(result).toBe(false);
		expect((res.send as jest.Mock).mock.calls[0][0].message).toMatch(/Wrong type/);
	});

	it('returns false if number is NaN', () => {
		const result = checkParameters({ age: 'abc' }, res as Response, [['age', 'number']], 'TEST');
		expect(result).toBe(false);
	});

	it('returns true if all parameters are correct', () => {
		(mongoose.isValidObjectId as jest.Mock).mockReturnValue(true);
		const result = checkParameters(
			{ name: 'John', age: 25, id: '60f7fe7c29e0e8b8e0c12345' },
			res as Response,
			[
				['name', 'string'],
				['age', 'number'],
				['id', 'ObjectId']
			],
			'TEST'
		);
		expect(result).toBe(true);
	});

	it('returns true if all parameters are correct with optional', () => {
		(mongoose.isValidObjectId as jest.Mock).mockReturnValue(true);
		const result = checkParameters(
			{ name: 'John', age: 25, id: '60f7fe7c29e0e8b8e0c12345' },
			res as Response,
			[
				['name', 'string'],
				['age', 'number', true],
				['id', 'ObjectId']
			],
			'TEST'
		);
		expect(result).toBe(true);
	});

	it('returns false if optional parameter has wrong type', () => {
		const result = checkParameters(
			{ name: 'John', age: 'twenty-five' },
			res as Response,
			[
				['name', 'string'],
				['age', 'number', true]
			],
			'TEST'
		);
		expect(result).toBe(false);
		expect((res.send as jest.Mock).mock.calls[0][0].message).toMatch(/Wrong type/);
	});
});

describe('checkPinCode', () => {
	let res: Partial<Response>;

	beforeEach(() => {
		const mockReq = { hostname: 'localhost' } as unknown as import('express').Request;
		res = {
			status: jest.fn().mockReturnThis(),
			send: jest.fn(),
			req: mockReq
		};
		log.mockClear();
	});

	it('rejects a PIN code that is too short', () => {
		expect(checkPinCode('123', res as Response, 'ORIGIN')).toBe(false);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it('rejects a non-numeric PIN code', () => {
		expect(checkPinCode('abcd', res as Response, 'ORIGIN')).toBe(false);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it('accepts a valid PIN code', () => {
		expect(checkPinCode('1234', res as Response, 'ORIGIN')).toBe(true);
	});
});

describe('hashPassword', () => {
	let res: Partial<Response>;

	beforeEach(() => {
		const mockReq = { hostname: 'localhost' } as unknown as import('express').Request;
		res = {
			status: jest.fn().mockReturnThis(),
			send: jest.fn(),
			req: mockReq
		};
		log.mockClear();
	});

	it('hashes the password if it is not already hashed', () => {
		const hashed = hashPasword('mypassword', false, res as Response);
		expect(typeof hashed).toBe('string');
		expect((hashed as string).length).toBeGreaterThan(0);
	});

	it('hashes a password even if `alreadyHashed = true` but the length is incorrect', () => {
		const hashed = hashPasword('short', true, res as Response);
		expect(typeof hashed).toBe('string');
	});

	it('rejects an invalid hash', () => {
		const result = hashPasword('g'.repeat(128), true, res as Response);
		expect(result).toBe(false);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it('returns the hash if it is already valid', () => {
		const validHash = 'a'.repeat(128);
		(global as any).sanitizeString = (s: string) => s;
		const result = hashPasword(validHash, true, res as Response);
		expect(result).toBe(validHash);
	});
});
