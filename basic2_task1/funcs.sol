// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract funcs {

    function reverseString(string calldata s) external pure returns (string memory) {
        bytes memory tempArr = bytes(s);
        bytes memory reversedString = new bytes(tempArr.length);
        for(uint i = 0; i < tempArr.length ; i++){            
            //reversing the string 
            reversedString[i] = tempArr[tempArr.length - i - 1];
        }
        return string(reversedString);
    }

    function romanToInt(string calldata s) external pure returns (uint) {
        bytes memory tempArr = bytes(s);
        uint result;
        uint preValue;
        for (uint i = 0; i < tempArr.length ; i++){
            uint value;
            if (tempArr[i] == 'I') value = 1;
            else if (tempArr[i] == 'V') value = 5;
            else if (tempArr[i] == 'X') value = 10;
            else if (tempArr[i] == 'L') value = 50;
            else if (tempArr[i] == 'C') value = 100;
            else if (tempArr[i] == 'D') value = 500;
            else if (tempArr[i] == 'M') value = 1000;

            result += value;
            if (preValue < value) {
                result = result - 2 * preValue;
            }
            preValue = value;    
        }
        return result;
    }

    function intToRoman(uint num) external pure returns (string memory) {
      string[13] memory romanSymbols = [
          "M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"
      ];
      uint[13] memory romanValues = [
          uint(1000), 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1
      ];
      bytes memory result = new bytes(0);
      for (uint i = 0; i < romanSymbols.length; i++) {
          while (num >= romanValues[i]) {
              result = abi.encodePacked(result, romanSymbols[i]);
              num -= romanValues[i];
          }
      }
      return string(result);
    }

    function mergeSortedArray(uint[] calldata arr1, uint[] calldata arr2) external pure returns (uint[] memory) {
        uint lengthArr1 = arr1.length;
        uint lengthArr2 = arr2.length;
        uint[] memory result = new uint[](lengthArr1 + lengthArr2);
    
        uint j = 0;
        uint k = 0;
        for (uint i = 0; i < result.length; i++) {
            if (j >= lengthArr1) {
                result[i] = arr2[k];
                k += 1;
                continue;
            }
            if (k >= lengthArr2) {
                result[i] = arr1[j];
                j += 1;
                continue;
            }

            if (arr1[j] <= arr2[k]) {
                result[i] = arr1[j];
                j += 1;
            } else{
                result[j] = arr2[k];
                k += 1;
            }
        }
        return result;
    }

    function binarySearch(uint[] calldata arr, uint target) external pure returns (uint res) {
        uint start = 0;
        uint end = arr.length - 1;
        while (start < end) {
          uint mid = start + (end - start) / 2;
          if (arr[mid] == target) {
            res = mid;
            return res;
          } else if (arr[mid] < target) {
            start = mid + 1;
          } else {
            end = mid - 1;
          }
        }
        return res;
    }
}