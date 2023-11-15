import Joi from 'joi';
import { has, validNumber } from './util.js';

const keyPattern = /[a-z0-9-]+/;

const parametersSchema = Joi.object({
  from: Joi.number().required().min(0).max(1),
  to: Joi.number().required().min(0).max(1),
  phase: Joi.number(),
  ecc: Joi.number(),
  noise: Joi.any(),
  motion: Joi.string(),
}).required();

const noiseSchema = Joi.object({
  from: Joi.number().min(0).max(1),
  to: Joi.number().min(0).max(1),
});

const behaviorSchema = Joi.object({
  name: Joi.string().required().pattern(keyPattern),
  type: Joi.string().required().pattern(/tempest-stroke|ayvascript/),
  data: Joi.object().required(),
});

const scriptSchema = Joi.object({
  script: Joi.string().required(),
});

function validateTempestStroke (stroke) {
  const axes = Object.keys(stroke);

  if (!axes.length) {
    return false;
  }

  for (const axis of axes) {
    if (parametersSchema.validate(stroke[axis]).error) {
      return false;
    }

    if (has(stroke[axis], 'noise')) {
      const { noise } = stroke[axis];

      if (!validNumber(noise, 0, 1) && noiseSchema.validate(noise).error) {
        return false;
      }
    }
  }

  return true;
}

function validateAyvaScript (data) {
  if (scriptSchema.validate(data).error) {
    return false;
  }

  return true;
}

export default {
  validate (behaviors) {
    for (const behavior of behaviors) {
      if (behaviorSchema.validate(behavior).error) {
        return false;
      }

      const { type, data } = behavior;

      if (type === 'tempest-stroke') {
        return validateTempestStroke(data);
      } else if (type === 'ayvascript') {
        return validateAyvaScript(data);
      }
    }

    return false;
  },
};
