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
      bytes memory result = new bytes(0);
      uint tempNum = num;
      for (;;) {
        if (tempNum >= 1000) {
            result = abi.encodePacked(result, "M");
            tempNum -= 1000;
        } else if (tempNum >= 900) {
            result = abi.encodePacked(result, "CM");
            tempNum -= 900;
        } else if (tempNum >= 500) {
            result = abi.encodePacked(result, "D");
            tempNum -= 500;
        } else if (tempNum >= 400) {
            result = abi.encodePacked(result, "CD");
            tempNum -= 400;
        } else if (tempNum >= 100) {
            result = abi.encodePacked(result, "C");
            tempNum -= 100;
        } else if (tempNum >= 90) {
            result = abi.encodePacked(result, "XC");
            tempNum -= 90;
        } else if (tempNum >= 50) {
            result = abi.encodePacked(result, "C");
            tempNum -= 50;
        } else if (tempNum >= 40) {
            result = abi.encodePacked(result, "XL");
            tempNum -= 40;
        } else if (tempNum >= 10) {
            result = abi.encodePacked(result, "X");
            tempNum -= 10;
        } else if (tempNum == 9){
            result = abi.encodePacked(result, "IX");
            break;
        } else  if (tempNum >= 5) {
            result = abi.encodePacked(result, "V");
            tempNum -= 5;
        } else if (tempNum == 4){
            result = abi.encodePacked(result, "IV");
            break;
        } else{
            result = abi.encodePacked(result, "I");
            tempNum -=1;
        }

        if (tempNum == 0) break;
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
                continue;
            }
            if (k >= lengthArr2) {
                result[i] = arr1[j];
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
        for (; start < end;) {
            uint mid = (start + end)/2;
            if (arr[mid] < target) start = mid;
            else if (arr[mid] > target) end = mid;
            else {
                res = mid;
                break;
            }

            if (start + 1 == end) {
                res = arr[start] == target ? start: end;
                break;
            }
        }
        return res;
    }
}