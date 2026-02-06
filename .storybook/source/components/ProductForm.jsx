import { useState, useCallback } from 'react';

/**
 * ProductForm - A multi-section form for capturing product vision information
 * including product name, description, problems/solutions, and key features.
 *
 * @param {Object} props
 * @param {Function} props.onSubmit - Callback with form data: { name, description, problems, features }
 * @param {Object} [props.initialData] - Optional initial form data for editing
 * @param {string} [props.submitLabel='Save Product Vision'] - Custom submit button label
 */
export function ProductForm({ onSubmit, initialData = {}, submitLabel = 'Save Product Vision' }) {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    description: initialData.description || '',
    problems: initialData.problems || [{ title: '', solution: '' }],
    features: initialData.features || [''],
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const validate = useCallback(() => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Product description is required';
    }

    const hasValidProblem = formData.problems.some(
      (p) => p.title.trim() && p.solution.trim()
    );
    if (!hasValidProblem) {
      newErrors.problems = 'At least one problem with a solution is required';
    }

    const hasValidFeature = formData.features.some((f) => f.trim());
    if (!hasValidFeature) {
      newErrors.features = 'At least one key feature is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);

    if (validate()) {
      // Clean up empty entries before submitting
      const cleanedData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        problems: formData.problems.filter((p) => p.title.trim() || p.solution.trim()),
        features: formData.features.filter((f) => f.trim()),
      };
      onSubmit(cleanedData);
    }
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (submitted) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // --- Problem helpers ---
  const addProblem = () => {
    setFormData((prev) => ({
      ...prev,
      problems: [...prev.problems, { title: '', solution: '' }],
    }));
  };

  const updateProblem = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.problems];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, problems: updated };
    });
    if (submitted) {
      setErrors((prev) => ({ ...prev, problems: undefined }));
    }
  };

  const removeProblem = (index) => {
    if (formData.problems.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      problems: prev.problems.filter((_, i) => i !== index),
    }));
  };

  // --- Feature helpers ---
  const addFeature = () => {
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, ''],
    }));
  };

  const updateFeature = (index, value) => {
    setFormData((prev) => {
      const updated = [...prev.features];
      updated[index] = value;
      return { ...prev, features: updated };
    });
    if (submitted) {
      setErrors((prev) => ({ ...prev, features: undefined }));
    }
  };

  const removeFeature = (index) => {
    if (formData.features.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="debo:space-y-6">
      {/* Product Name */}
      <div>
        <label
          htmlFor="product-name"
          className="debo:block debo:text-sm debo:font-medium debo:text-base-content debo:mb-1.5"
        >
          Product Name <span className="debo:text-error">*</span>
        </label>
        <input
          id="product-name"
          type="text"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="e.g., Designbook"
          className={`debo:input debo:input-bordered debo:w-full ${
            errors.name ? 'debo:input-error' : ''
          }`}
        />
        {errors.name && (
          <p className="debo:text-error debo:text-xs debo:mt-1">{errors.name}</p>
        )}
      </div>

      {/* Product Description */}
      <div>
        <label
          htmlFor="product-description"
          className="debo:block debo:text-sm debo:font-medium debo:text-base-content debo:mb-1.5"
        >
          Description <span className="debo:text-error">*</span>
        </label>
        <textarea
          id="product-description"
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Describe your product in 1-3 sentences..."
          rows={3}
          className={`debo:textarea debo:textarea-bordered debo:w-full ${
            errors.description ? 'debo:textarea-error' : ''
          }`}
        />
        {errors.description && (
          <p className="debo:text-error debo:text-xs debo:mt-1">{errors.description}</p>
        )}
      </div>

      {/* Problems & Solutions */}
      <div>
        <div className="debo:flex debo:items-center debo:justify-between debo:mb-3">
          <label className="debo:text-sm debo:font-medium debo:text-base-content">
            Problems & Solutions <span className="debo:text-error">*</span>
          </label>
          <button
            type="button"
            onClick={addProblem}
            className="debo:btn debo:btn-ghost debo:btn-xs"
          >
            + Add Problem
          </button>
        </div>
        {errors.problems && (
          <p className="debo:text-error debo:text-xs debo:mb-2">{errors.problems}</p>
        )}
        <div className="debo:space-y-3">
          {formData.problems.map((problem, index) => (
            <div
              key={index}
              className="debo:flex debo:gap-2 debo:items-start debo:p-3 debo:bg-base-200 debo:rounded-lg"
            >
              <div className="debo:flex-1 debo:space-y-2">
                <input
                  type="text"
                  value={problem.title}
                  onChange={(e) => updateProblem(index, 'title', e.target.value)}
                  placeholder="Problem title..."
                  className="debo:input debo:input-bordered debo:input-sm debo:w-full"
                />
                <input
                  type="text"
                  value={problem.solution}
                  onChange={(e) => updateProblem(index, 'solution', e.target.value)}
                  placeholder="How does the product solve it?"
                  className="debo:input debo:input-bordered debo:input-sm debo:w-full"
                />
              </div>
              {formData.problems.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeProblem(index)}
                  className="debo:btn debo:btn-ghost debo:btn-xs debo:text-error debo:mt-1"
                  aria-label="Remove problem"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Key Features */}
      <div>
        <div className="debo:flex debo:items-center debo:justify-between debo:mb-3">
          <label className="debo:text-sm debo:font-medium debo:text-base-content">
            Key Features <span className="debo:text-error">*</span>
          </label>
          <button
            type="button"
            onClick={addFeature}
            className="debo:btn debo:btn-ghost debo:btn-xs"
          >
            + Add Feature
          </button>
        </div>
        {errors.features && (
          <p className="debo:text-error debo:text-xs debo:mb-2">{errors.features}</p>
        )}
        <div className="debo:space-y-2">
          {formData.features.map((feature, index) => (
            <div key={index} className="debo:flex debo:gap-2 debo:items-center">
              <input
                type="text"
                value={feature}
                onChange={(e) => updateFeature(index, e.target.value)}
                placeholder={`Feature ${index + 1}...`}
                className="debo:input debo:input-bordered debo:input-sm debo:w-full"
              />
              {formData.features.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeFeature(index)}
                  className="debo:btn debo:btn-ghost debo:btn-xs debo:text-error"
                  aria-label="Remove feature"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="debo:pt-2">
        <button type="submit" className="debo:btn debo:btn-primary debo:w-full">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
