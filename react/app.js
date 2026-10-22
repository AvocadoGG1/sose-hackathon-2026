//Justin - this is where I'm putting my code, but I'm not sure how to connect it atm
class cart {
    //these expect an array with the following order: name, cal per serving, grams per serving, total grams chosen, totalFat, cholesterol, sodium, totalCarbohydrate, dietaryFiber, totalSugar, protein, vitaminD, calcium, iron, potassium
    static items = [];
    static numberOfItems = 0;
    static totalCalories = 0;
    static vitamins = {
        //values that store the total amount of each vitamin in the cart
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
        //values that store the recommended daily amount of each vitamin
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

    vitiminsArray = [
        this.vitamins.totalFat,
        this.vitamins.cholesterol,
        this.vitamins.sodium,
        this.vitamins.totalCarbohydrate,
        this.vitamins.dietaryFiber,
        this.vitamins.totalSugar,
        this.vitamins.protein,
        this.vitamins.vitaminD,
        this.vitamins.calcium,
        this.vitamins.iron,
        this.vitamins.potassium,
        this.vitamins.reccomendedTotalFat,
        this.vitamins.reccomendedCholesterol,
        this.vitamins.reccomendedSodium,
        this.vitamins.reccomendedTotalCarbohydrate,
        this.vitamins.reccomendedDietaryFiber,
        this.vitamins.reccomendedTotalSugar,
        this.vitamins.reccomendedProtein,
        this.vitamins.reccomendedVitaminD,
        this.vitamins.reccomendedCalcium,
        this.vitamins.reccomendedIron,
        this.vitamins.reccomendedPotassium
    ];
    static addItem(item) {
        const existingItem = this.items.find(cartItem => cartItem[0] === item[0]);

        if (existingItem) {
            existingItem[3] += item[3];
        } else {
            this.items.push([...item]); // Keep a copy so callers can't mutate the cart.
            this.numberOfItems++;
        }

        this.increaseVitamins(item);
        this.totalCalories += item[1] * item[3] / item[2];
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
        return [
            (this.vitamins.totalFat / this.vitamins.reccomendedTotalFat) * 100,
            (this.vitamins.cholesterol / this.vitamins.reccomendedCholesterol) * 100,
            (this.vitamins.sodium / this.vitamins.reccomendedSodium) * 100,
            (this.vitamins.totalCarbohydrate / this.vitamins.reccomendedTotalCarbohydrate) * 100,
            (this.vitamins.dietaryFiber / this.vitamins.reccomendedDietaryFiber) * 100,
            (this.vitamins.totalSugar / this.vitamins.reccomendedTotalSugar) * 100,
            (this.vitamins.protein / this.vitamins.reccomendedProtein) * 100,
            (this.vitamins.vitaminD / this.vitamins.reccomendedVitaminD) * 100,
            (this.vitamins.calcium / this.vitamins.reccomendedCalcium) * 100,
            (this.vitamins.iron / this.vitamins.reccomendedIron) * 100,
            (this.vitamins.potassium / this.vitamins.reccomendedPotassium) * 100
        ];
    }

    static getUnfilledNutrition() {
        let unfilled = [];
        for (let i = 0; i < this.vitaminsArray.length/2; i++) {
            if (this.vitaminsArray[i+10] - this.vitaminsArray[i] > 0) {
                unfilled[i] = this.vitaminsArray[i+10] - this.vitaminsArray[i];
            }
            else {
                unfilled[i] = 0;
            }
        }
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
            reccomendedTotalFat: 98,
            reccomendedCholesterol: .3,
            reccomendedSodium: 2.3,
            reccomendedTotalCarbohydrate: 275,
            reccomendedDietaryFiber: 28,
            reccomendedTotalSugar: 100,
            reccomendedProtein: 50,
            reccomendedVitaminD: .00002,
            reccomendedCalcium: 1.3,
            reccomendedIron: .018,
            reccomendedPotassium: 4.7
            }
    }   

    static getNumberOfItems() {
        return this.numberOfItems;
    }
}