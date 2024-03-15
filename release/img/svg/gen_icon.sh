#!/usr/bin/env bash
# 
# Generate png icons of different sizes from an svg file
# Ex: gen_icon.sh radarr.svg img/radarr/

SIZES="128:128 48:48 32:32 16:16"
input_file=$1
output=${2:-"."}
filename=${input_file%.*}
suffix=${input_file##*.}

if [[ "$suffix" == "svg" ]]; then
    echo "Generating icons from $input_file to $output/$filename-<size>.png"

    for sz in $SIZES; do
        szn=${sz%:*}
        svgexport $input_file $output/$filename-$szn.png $sz
    done
else
    echo "gen_icon.sh something.svg [<output folder]"
fi
