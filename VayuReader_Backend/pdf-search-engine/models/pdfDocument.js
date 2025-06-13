const Joi = require('joi');

// Joi validation schema
const acronymJoiSchema = Joi.object({
  acronym: Joi.string()
    .min(1)
    .max(10)
    .pattern(/^[A-Z]+$/)
    .required(),
  fullForm: Joi.string()
    .min(3)
    .max(200)
    .required()
});

// Simple validation function
function validateAcronym(data) {
  const { error } = acronymJoiSchema.validate(data, { abortEarly: false });
  return {
    isValid: !error,
    errors: error ? error.details.map(d => d.message) : []
  };
}

// Acronym model class
class AcronymModel {
  constructor() {
    this.acronyms = [
      { acronym: "IAS", fullForm: "Indian Administrative Service" },
      { acronym: "IPS", fullForm: "Indian Police Service" },
      { acronym: "IFS", fullForm: "Indian Foreign Service" },
      { acronym: "NASA", fullForm: "National Aeronautics and Space Administration" },
      { acronym: "WHO", fullForm: "World Health Organization" },
      { acronym: "AI", fullForm: "Artificial Intelligence" },
      { acronym: "API", fullForm: "Application Programming Interface" },
      { acronym: "URL", fullForm: "Uniform Resource Locator" },
      { acronym: "GDP", fullForm: "Gross Domestic Product" },
      { acronym: "UN", fullForm: "United Nations" },
      { acronym: "USA", fullForm: "United States of America" },
      { acronym: "UK", fullForm: "United Kingdom" },
      { acronym: "CEO", fullForm: "Chief Executive Officer" },
      { acronym: "CTO", fullForm: "Chief Technology Officer" },
      { acronym: "HR", fullForm: "Human Resources" }
    ];
  }

  getAll() {
    return this.acronyms;
  }

  find(acronym) {
    return this.acronyms.find(item =>
      item.acronym.toLowerCase() === acronym.toLowerCase()
    );
  }

  add(acronym, fullForm) {
    const data = { acronym, fullForm };
    const validation = validateAcronym(data);

    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const newAcronym = {
      acronym: acronym.toUpperCase(),
      fullForm: fullForm.trim()
    };

    this.acronyms.push(newAcronym);
    return newAcronym;
  }
}

module.exports = {
  AcronymModel,
  validateAcronym
};
