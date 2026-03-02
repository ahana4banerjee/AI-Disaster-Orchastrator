"use client";

import { useState } from "react";
import API from "@/lib/api";
import ResultCard from "./ResultCard";

export default function DisasterForm() {
  const [form, setForm] = useState({
    disaster_type: "",
    magnitude: "",
    population_density: "",
    rainfall: "",
    infrastructure_score: "",
  });

  const [result, setResult] = useState<any>(null);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    try {
      const response = await API.post("/predict", {
        disaster_type: form.disaster_type,
        magnitude: parseFloat(form.magnitude),
        population_density: parseFloat(form.population_density),
        rainfall: parseFloat(form.rainfall),
        infrastructure_score: parseFloat(form.infrastructure_score),
      });

      setResult(response.data);
    } catch (error) {
      console.error(error);
      alert("Error connecting to backend");
    }
  };

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 max-w-md"
      >
        <input
          name="disaster_type"
          placeholder="Disaster Type"
          onChange={handleChange}
          className="p-2 rounded text-white-900"
        />

        <input
          name="magnitude"
          type="number"
          placeholder="Magnitude"
          onChange={handleChange}
          className="p-2 rounded text-white-900"
        />

        <input
          name="population_density"
          type="number"
          placeholder="Population Density"
          onChange={handleChange}
          className="p-2 rounded text-white-900"
        />

        <input
          name="rainfall"
          type="number"
          placeholder="Rainfall"
          onChange={handleChange}
          className="p-2 rounded text-white-900"
        />

        <input
          name="infrastructure_score"
          type="number"
          placeholder="Infrastructure Score"
          onChange={handleChange}
          className="p-2 rounded text-white-900"
        />

        <button
          type="submit"
          className="bg-blue-600 p-2 rounded hover:bg-blue-700"
        >
          Predict
        </button>
      </form>

      {result && <ResultCard data={result} />}
    </div>
  );
}