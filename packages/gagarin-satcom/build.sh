#!/bin/bash
echo -e ""
echo -e "\033[32mBABEL: 1st run"
echo -e         "==============\033[0m"
babel src/ --out-dir lib/
echo -e ""
echo -e "\033[32mBABEL: 2nd run"
echo -e         "==============\033[0m"
babel --plugins transform-runtime lib/ --out-dir lib/
echo -e ""
echo -e "\033[32m\xE2\x9C\x93 done\033[0m"
echo -e ""
