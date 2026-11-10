// TDEEBMR - Shared Calculator Logic
// All formulas use metric (kg, cm) internally; conversions provided

const Calc = {
  // Unit conversions
  lbsToKg: lbs => lbs / 2.20462,
  kgToLbs: kg => kg * 2.20462,
  inchesToCm: inches => inches * 2.54,
  cmToInches: cm => cm / 2.54,
  feetInchesToInches: (ft, inches) => ft * 12 + inches,
  feetInchesToCm: (ft, inches) => (ft * 12 + inches) * 2.54,

  // BMR Formulas
  bmr: {
    // Mifflin-St Jeor (1990) - recommended for most people
    mifflin: (weightKg, heightCm, age, sex) => {
      const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
      return sex === 'male' ? base + 5 : base - 161;
    },

    // Harris-Benedict revised (1984)
    harris: (weightKg, heightCm, age, sex) => {
      if (sex === 'male') {
        return 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age;
      }
      return 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.330 * age;
    },

    // Katch-McArdle (1996) - requires body fat %
    katch: (bodyFatPercent, weightKg) => {
      const lbm = weightKg * (1 - bodyFatPercent / 100);
      return 370 + 21.6 * lbm;
    }
  },

  // Activity multipliers
  activityLevels: {
    sedentary:     { factor: 1.2,   label: 'Sedentary',      desc: 'Little or no exercise, desk job' },
    light:         { factor: 1.375, label: 'Lightly Active', desc: 'Exercise 1-3 days/week' },
    moderate:      { factor: 1.55,  label: 'Moderately Active', desc: 'Exercise 3-5 days/week' },
    active:        { factor: 1.725, label: 'Very Active',    desc: 'Hard exercise 6-7 days/week' },
    extraActive:   { factor: 1.9,   label: 'Extra Active',   desc: 'Very hard exercise, physical job, 2x/day training' }
  },

  // TDEE = BMR x Activity Factor
  tdee: (bmr, activityLevel) => bmr * Calc.activityLevels[activityLevel].factor,

  // BMI = weight(kg) / height(m)^2
  bmi: (weightKg, heightCm) => {
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  },

  bmiCategory: bmi => {
    if (bmi < 18.5) return { label: 'Underweight', color: '#3b82f6' };
    if (bmi < 25) return { label: 'Normal weight', color: '#22c55e' };
    if (bmi < 30) return { label: 'Overweight', color: '#f59e0b' };
    if (bmi < 35) return { label: 'Obese (Class I)', color: '#ef4444' };
    if (bmi < 40) return { label: 'Obese (Class II)', color: '#dc2626' };
    return { label: 'Obese (Class III)', color: '#991b1b' };
  },

  // Calorie targets
  calorieTargets: tdee => ({
    maintain: Math.round(tdee),
    cut: Math.round(tdee - 500),
    leanBulk: Math.round(tdee + 250),
    bulk: Math.round(tdee + 500)
  }),

  // Macros calculation (balanced split)
  macros: (calories, goal = 'maintain') => {
    let proteinRatio, fatRatio, carbRatio;
    switch (goal) {
      case 'cut':
        proteinRatio = 0.35; fatRatio = 0.30; carbRatio = 0.35;
        break;
      case 'bulk':
        proteinRatio = 0.25; fatRatio = 0.25; carbRatio = 0.50;
        break;
      default: // maintain
        proteinRatio = 0.30; fatRatio = 0.30; carbRatio = 0.40;
    }
    return {
      protein: { grams: Math.round(calories * proteinRatio / 4), calories: Math.round(calories * proteinRatio), percent: Math.round(proteinRatio * 100) },
      fat: { grams: Math.round(calories * fatRatio / 9), calories: Math.round(calories * fatRatio), percent: Math.round(fatRatio * 100) },
      carbs: { grams: Math.round(calories * carbRatio / 4), calories: Math.round(calories * carbRatio), percent: Math.round(carbRatio * 100) }
    };
  },

  // Protein needs (g per kg body weight)
  proteinNeeds: (weightKg, activityLevel, goal = 'maintain') => {
    let factor;
    if (goal === 'cut') {
      // Higher protein during deficit to preserve muscle
      const factors = { sedentary: 1.2, light: 1.6, moderate: 1.8, active: 2.0, extraActive: 2.2 };
      factor = factors[activityLevel] || 1.6;
    } else if (goal === 'bulk') {
      const factors = { sedentary: 1.0, light: 1.2, moderate: 1.4, active: 1.6, extraActive: 1.8 };
      factor = factors[activityLevel] || 1.4;
    } else {
      const factors = { sedentary: 0.8, light: 1.0, moderate: 1.2, active: 1.4, extraActive: 1.6 };
      factor = factors[activityLevel] || 1.0;
    }
    return Math.round(weightKg * factor);
  },

  // Body Fat % - US Navy Method
  // The published Hodgdon & Beckett (1984) constants are inch-based, so cm inputs are converted first.
  bodyFatNavy: (neckCm, waistCm, heightCm, sex, hipCm = null) => {
    const neckIn = Calc.cmToInches(neckCm);
    const waistIn = Calc.cmToInches(waistCm);
    const heightIn = Calc.cmToInches(heightCm);
    if (sex === 'male') {
      return 86.010 * Math.log10(Math.max(waistIn - neckIn, 0.1)) - 70.041 * Math.log10(heightIn) + 36.76;
    }
    const hipIn = Calc.cmToInches(hipCm);
    return 163.205 * Math.log10(Math.max(waistIn + hipIn - neckIn, 0.1)) - 97.684 * Math.log10(heightIn) - 78.387;
  },

  // Body Fat % - BMI method (approximation)
  bodyFatBMI: (bmi, age, sex) => {
    if (sex === 'male') {
      return 1.20 * bmi + 0.23 * age - 16.2;
    }
    return 1.20 * bmi + 0.23 * age - 5.4;
  },

  // Categories follow the ACE ranges published in this site's body-fat FAQ and table
  bodyFatCategory: (bfPercent, sex) => {
    if (sex === 'male') {
      if (bfPercent < 6) return 'Essential Fat';
      if (bfPercent < 14) return 'Athletes';
      if (bfPercent < 18) return 'Fitness';
      if (bfPercent < 25) return 'Average';
      return 'Above Average';
    }
    if (bfPercent < 14) return 'Essential Fat';
    if (bfPercent < 21) return 'Athletes';
    if (bfPercent < 25) return 'Fitness';
    if (bfPercent < 32) return 'Average';
    return 'Above Average';
  },

  // Ideal Weight formulas
  idealWeight: (heightCm, sex) => {
    const inchesOver5ft = Math.max(0, Calc.cmToInches(heightCm) - 60);
    return {
      devine:   sex === 'male' ? 50 + 2.3 * inchesOver5ft : 45.5 + 2.3 * inchesOver5ft,
      robinson: sex === 'male' ? 52 + 1.9 * inchesOver5ft : 49 + 1.7 * inchesOver5ft,
      miller:   sex === 'male' ? 56.2 + 1.41 * inchesOver5ft : 53.1 + 1.36 * inchesOver5ft,
      hamwi:    sex === 'male' ? 48 + 2.7 * inchesOver5ft : 45.5 + 2.2 * inchesOver5ft
    };
  },

  // Lean Body Mass (multiple formulas)
  leanBodyMass: {
    // Boer formula
    boer: (weightKg, heightCm, sex) => {
      if (sex === 'male') return 0.407 * weightKg + 0.267 * heightCm - 19.2;
      return 0.252 * weightKg + 0.473 * heightCm - 48.3;
    },
    // Hume formula
    hume: (weightKg, heightCm, sex) => {
      if (sex === 'male') return 0.32810 * weightKg + 0.33929 * heightCm - 29.5336;
      return 0.29569 * weightKg + 0.41813 * heightCm - 43.2933;
    },
    // James formula
    james: (weightKg, heightCm, sex) => {
      const heightM = heightCm / 100;
      if (sex === 'male') return 1.1 * weightKg - 128 * (weightKg / heightM / 100) * (weightKg / heightM / 100);
      return 1.07 * weightKg - 148 * (weightKg / heightM / 100) * (weightKg / heightM / 100);
    },
    // From body fat %
    fromBF: (weightKg, bfPercent) => weightKg * (1 - bfPercent / 100)
  },

  // Water intake calculator
  waterIntake: (weightKg, activityLevel, climate = 'temperate') => {
    // Base: 30-35ml per kg
    let baseMl = weightKg * 33;
    
    // Activity adjustment
    const activityAdditions = {
      sedentary: 0,
      light: 250,
      moderate: 500,
      active: 750,
      extraActive: 1000
    };
    baseMl += activityAdditions[activityLevel] || 0;
    
    // Climate adjustment
    if (climate === 'hot') baseMl *= 1.15;
    if (climate === 'cold') baseMl *= 1.05;
    
    return {
      liters: Math.round(baseMl / 100) / 10,
      ml: Math.round(baseMl),
      cups: Math.round(baseMl / 240),
      oz: Math.round(baseMl / 29.574)
    };
  },

  // Calorie deficit calculator
  calorieDeficit: (currentWeightKg, targetWeightKg, weeksToGoal) => {
    const weightToLoseKg = currentWeightKg - targetWeightKg;
    const totalCalorieDeficit = weightToLoseKg * 7700; // ~7700 kcal per kg of fat
    const dailyDeficit = Math.round(totalCalorieDeficit / (weeksToGoal * 7));
    const weeklyLossKg = Math.round((weightToLoseKg / weeksToGoal) * 100) / 100;
    const weeklyLossLbs = Math.round(Calc.kgToLbs(weeklyLossKg) * 10) / 10;
    
    return {
      dailyDeficit,
      weeklyLossKg,
      weeklyLossLbs,
      totalWeeks: weeksToGoal,
      completionDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + weeksToGoal * 7);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      })(),
      safeRate: dailyDeficit <= 1000 && weeklyLossKg <= 1.0
    };
  },

  // Format number with commas
  format: (num, decimals = 0) => {
    return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
};

// FAQ Toggle
function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const wasOpen = item.classList.contains('open');
      // Close all
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      // Toggle current
      if (!wasOpen) item.classList.add('open');
    });
  });
}

// Mobile menu
function initMobileMenu() {
  const btn = document.querySelector('.mobile-menu-btn');
  const nav = document.querySelector('nav');
  if (btn && nav) {
    btn.addEventListener('click', () => nav.classList.toggle('open'));
  }
}

// Unit toggle for calculators
function initUnitToggle(callback) {
  const toggle = document.querySelector('.unit-toggle');
  if (!toggle) return;
  
  toggle.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      toggle.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      callback(btn.dataset.unit);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initFAQ();
  initMobileMenu();
});
