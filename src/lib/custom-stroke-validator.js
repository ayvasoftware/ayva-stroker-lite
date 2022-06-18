import Joi from 'joi';

const keyPattern = /[a-z0-9-]+/;

const parametersSchema = Joi.object({
  from: Joi.number().required().min(0).max(1),
  to: Joi.number().required().min(0).max(1),
  phase: Joi.number(),
  ecc: Joi.number(),
}).required();

const strokeSchema = Joi.object({
  name: Joi.string().required().pattern(keyPattern),
  type: Joi.string().required().pattern(/tempest-stroke/),
  data: Joi.object().required(),
});

export default {
  validate (strokes) {
    for (const stroke of strokes) {
      if (strokeSchema.validate(stroke).error) {
        return false;
      }

      const { data } = stroke;
      const axes = Object.keys(data);

      if (!axes.length) {
        return false;
      }

      for (const axis of axes) {
        if (parametersSchema.validate(data[axis]).error) {
          return false;
        }
      }
    }

    return true;
  },
};
