//Justin - this is where I'm putting my code, but I'm not sure how to connect it atm
class cart {
    //these expect an array with the following order: name, cal per serving, grams per serving, total grams chosen, totalFat, cholesterol, sodium, totalCarbohydrate, dietaryFiber, totalSugar, protein, vitaminD, calcium, iron, potassium
  constructor() {
    this.items = [];
  }
  static numberOfItems = 0;
  static totalCalories = 0;
  static vitamins ={
    totalFat: 0,
    cholesterol: 0,
    sodium: 0,
    totalCarbohydrate: 0,
    dietaryFiber: 0,
    totalSugar: 0,
    protein: 0,
    vitaminD: 0,
    calcium: 0,
    iron: 0,
    potassium: 0,
    reccomendedTotalFat: 98,
    reccomendedCholesterol: .3,
    reccomendedSodium: 2.3,
    reccomendedTotalCarbohydrate: 275,
    reccomendedDietaryFiber: 28,
    reccomendedTotalSugar: 100, //I don't know if 50g of non-added sugar is the right amount.
    reccomendedProtein: 50,
    reccomendedVitaminD: .00002,
    reccomendedCalcium: 1.3,
    reccomendedIron: .018,
    reccomendedPotassium: 4.7
  }

  static addItem(item) {
    if(this.items.includes(item)) {
        this.items[this.items.indexOf(item)][3] += item[3];
    } else {
        this.items.push(item);
        cart.numberOfItems++;
    }
    this.increaseVitamins(item);
    this.totalCalories += item[1]*item[3]/item[2];
  } 

  static increaseVitamins(item) {
    this.vitamins.totalFat          += item[4]*item[3]/item[2];
    this.vitamins.cholesterol       += item[5]*item[3]/item[2];
    this.vitamins.sodium            += item[6]*item[3]/item[2];
    this.vitamins.totalCarbohydrate += item[7]*item[3]/item[2];
    this.vitamins.dietaryFiber      += item[8]*item[3]/item[2];
    this.vitamins.totalSugar        += item[9]*item[3]/item[2];
    this.vitamins.protein           += item[10]*item[3]/item[2];
    this.vitamins.vitaminD          += item[11]*item[3]/item[2];
    this.vitamins.calcium           += item[12]*item[3]/item[2];
    this.vitamins.iron              += item[13]*item[3]/item[2];
    this.vitamins.potassium         += item[14]*item[3]/item[2];
  }

  static getNutritionPercentages() {
    return {
      totalFat: (this.vitamins.totalFat / this.vitamins.reccomendedTotalFat) * 100,
      cholesterol: (this.vitamins.cholesterol / this.vitamins.reccomendedCholesterol) * 100,
      sodium: (this.vitamins.sodium / this.vitamins.reccomendedSodium) * 100,
      totalCarbohydrate: (this.vitamins.totalCarbohydrate / this.vitamins.reccomendedTotalCarbohydrate) * 100,
      dietaryFiber: (this.vitamins.dietaryFiber / this.vitamins.reccomendedDietaryFiber) * 100,
      totalSugar: (this.vitamins.totalSugar / this.vitamins.reccomendedTotalSugar) * 100,
      protein: (this.vitamins.protein / this.vitamins.reccomendedProtein) * 100,
      vitaminD: (this.vitamins.vitaminD / this.vitamins.reccomendedVitaminD) * 100,
      calcium: (this.vitamins.calcium / this.vitamins.reccomendedCalcium) * 100,
      iron: (this.vitamins.iron / this.vitamins.reccomendedIron) * 100,
      potassium: (this.vitamins.potassium / this.vitamins.reccomendedPotassium) * 100
    };
  }

  static getUnfilledNutrition() {
    const unfilled = this.getNutritionPercentages().filter(nutrient => nutrient < 95);
    return unfilled;
  }

  static forEachItem(callback) {
    this.items.forEach(callback);
  }

  static removeItem(position) {
    const item = this.items[position];
    this.totalCalories              -= item[1]*item[3]/item[2];
    this.vitamins.totalFat          -= item[4]*item[3]/item[2];
    this.vitamins.cholesterol       -= item[5]*item[3]/item[2];
    this.vitamins.sodium            -= item[6]*item[3]/item[2];
    this.vitamins.totalCarbohydrate -= item[7]*item[3]/item[2];
    this.vitamins.dietaryFiber      -= item[8]*item[3]/item[2];
    this.vitamins.totalSugar        -= item[9]*item[3]/item[2];
    this.vitamins.protein           -= item[10]*item[3]/item[2];
    this.vitamins.vitaminD          -= item[11]*item[3]/item[2];
    this.vitamins.calcium           -= item[12]*item[3]/item[2];
    this.vitamins.iron              -= item[13]*item[3]/item[2];
    this.vitamins.potassium         -= item[14]*item[3]/item[2];
    this.items.splice(position, 1);
    this.numberOfItems--;
  }

    static clearCart() {
        this.items = [];
        this.numberOfItems = 0;
        this.totalCalories = 0;
        this.vitamins = {
            totalFat: 0,
            cholesterol: 0,
            sodium: 0,
            totalCarbohydrate: 0,
            dietaryFiber: 0,
            totalSugar: 0,
            protein: 0,
            vitaminD: 0,
            calcium: 0,
            iron: 0,
            potassium: 0,
        }
    }   
    
    static getNumberOfItems() {
        return this.numberOfItems;
    }
}