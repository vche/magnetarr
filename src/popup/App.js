import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import SettingsIcon from '@mui/icons-material/Settings';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import SearchIcon from '@mui/icons-material/Search';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';

import './App.css';
import {getProviderFromUrl} from "../lib/provider";
import {ItemTypes, getServerForType} from "../lib/server";

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const borderStyles = {
  borderRadius: '16px', 
  boxShadow: 2, 
  border: 1, 
  // borderBottom: 1,
  // borderRight: 1,
  borderColor: 'grey.500',
  bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#101010' : '#fff'),
  m: 2,
  p: 1,
};

async function getCurrentTabUrl() {
  var queryInfo = { active: true, currentWindow: true };
  const tabs = await chrome.tabs.query(queryInfo);
  return tabs[0].url;
}

function openUrl(item) {
  const url = item.server.getItemUrl(item);
  chrome.tabs.create({url: url });
}

function OptionMenu({tip, name, label, values, defaultval}) {
  return (
    <Tooltip title={tip}>
      <FormControl sx={{ m: 1}} size="small">
        <InputLabel id="id_profile">{label}</InputLabel>
        <Select
          labelId={`id_${name}`}
          name={name}
          id={`id_${name}_select`}
          defaultValue={defaultval || values[0].id}
        >
          {values.map((val) => (
            <MenuItem value={val.id}>{val.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Tooltip>
  )
}

function ItemAdd({item}) {
  function handleSubmit(event) {
    event.preventDefault();
    event.stopPropagation();

    const formData = new FormData(event.target);
    item.server.profileid = formData.get("sel_quality")
    item.server.auxinfo = formData.get("sel_auxinfo")
    item.server.folder = formData.get("sel_folder")
    item.server.saveConfig().then(() => {console.log("server config updated")});
  }

  return (
    <Box sx={{ ...borderStyles, display: 'flex', flexDirection: 'column', mt: 0, mb: 2}}>
      <form onSubmit={handleSubmit}>
      <FormGroup>
        {(item.itemtype == ItemTypes.Movie)&&(
          <OptionMenu 
              name = "sel_auxinfo"
              tip = "Minimum availability before downloading"
              label = "Minimum availability"
              values = {item.server.getAuxInfoValues()}
              defaultval = {item.server.auxinfo}
          />
        )}

        {(item.itemtype == ItemTypes.Serie)&&(
          <OptionMenu 
            name = "sel_auxinfo"
            tip = "Serie type"
            label = "Serie type"
            values = {item.server.getAuxInfoValues()}
            defaultval = {item.server.auxinfo}
          />
        )}

        <OptionMenu 
          name = "sel_quality"
          tip = {`Required quality profile for this ${item.itemtype}`}
          label = "Quality profile"
          values = {item.server.profiles}
          defaultval = {item.server.profileid}
        />

        <OptionMenu 
          name = "sel_folder"
          tip = {`Folder where to import the ${item.itemtype}`}
          label = "Import folder"
          values = {item.server.folders}
          defaultval = {item.server.folder}
        />
      </FormGroup>

      <Box sx={{display: 'flex', flexDirection: 'row', mt: 0, justifyContent: 'space-between', m: 1, mt: 0, pb: 0 }}>
        <Tooltip title="Start monitoring when added">
          <FormControlLabel control={<Switch defaultChecked />} label="Monitored" />
        </Tooltip>
        <Tooltip title={`Add the ${item.itemtype}`}>
          <Button type="submit" variant="outlined" startIcon={<SearchIcon />}>Add</Button>
          {/* <IconButton><SearchIcon /> </IconButton>           */}
        </Tooltip>
      </Box>
      </form>
    </Box>    
  )
}

function ItemContent({item}) {
  return (
    <Box sx={{ ...borderStyles, display: 'flex', flexDirection: 'row'}}>
      <CardMedia
        component="img"
        sx={{ display: 'flex', width: 100, height: 150 }}
        image={item.getPosterUrl()}
        alt={`Poster for ${item.properties.title}`}
      />
      <CardContent>
        <Typography component="div" variant="h6" sx={{ display: 'flex'}}>
          {item.properties.title}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" component="div" sx={{ display: 'flex'}}>
        {`(${item.properties.year})`}
        </Typography>
        <Typography className='truncText' variant="caption" color="text.secondary" component="div" sx={{ 
          display: 'flex',
          height: 55,
          }} >
        {`(${item.properties.overview})`}
        </Typography>
      </CardContent>
    </Box>
  )
}

function ItemHeader({item}) {
  return (
    <Typography component="div" variant="h5" sx={{ display: 'flex', flexDirection: 'row', p: 1, justifyContent: 'space-between' }}>
      <Tooltip title={`Open ${item.server.name}`}>
        <Box sx={{ display: 'flex', ml:1}}>
          <a id="card-header" href={item.server.getUrl()}><img src={item.server.getLogo(32)}/></a>
        </Box>
        </Tooltip>
      <Box sx={{ display: 'flex', pl: 1}}>
        {`Add to ${item.server.name}`}
      </Box>
      <Tooltip title="Open magnetarr settings">
        <IconButton aria-label="settings" onClick={() => {chrome.runtime.openOptionsPage()}}>
          <SettingsIcon />
        </IconButton>
      </Tooltip>
    </Typography>
  )
}

export default function App() {
  const [errorText, setErrorText] = React.useState("")
  const [item, setItem] = React.useState(null)

  // Retrieve info of item displayed in the current tab url
  async function getItemInfo() {
    const targetUrl = await getCurrentTabUrl();
    const provider = getProviderFromUrl(targetUrl);
    if (provider) {
      // Find item id and type from the url to get the server that can handle this item
      const item = await  provider.itemFromUrl(targetUrl); 
      const server = getServerForType(item.itemtype);
      item.provider = provider;
      item.server = server;
      console.debug(`Found: ${item.itemid}, type: ${item.itemtype}, server: ${server.name}`);

      // Load config, and check if ther server is enabled before notifying the ui
      await server.loadConfig(true, true);
      if (! server.enabled) { throw Error("Server not enabled, make sure to configure it."); }

      // Querying the item id to get info
      await server.getItemInfo(item);
      return item;
    }
    throw Error("No provider found matching url " + targetUrl);
  }

  React.useEffect(() => {
    if (!item){
      getItemInfo().then((item) => {
        setItem(item);
        console.log("Item info: "); console.log(item);
      }).catch((error) => {
        console.error("Couldn't get item info: " + error);
        setErrorText("Couldn't extract item information: " + error);
      });
    }
  }, [item])

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      {!item?(
        <Box sx={{ display: 'flex', justifyContent: 'center', width: 200, height: 200, pt:8}}>
          <CircularProgress />
        </Box>        
      ):(
        <Card className="App" sx={{ display: 'flex', flexDirection: 'column' }}>
          <ItemHeader item={item} />

          {/* Status text */}
          {errorText && (
              <Box sx={{ display: 'flex', pl: 1}}>
                <Typography variant="caption" display="block" gutterBottom className="errorText">
                  {errorText}
                </Typography>
            </Box>)}
            
          <ItemContent item={item} />
    
          {item.exists?(
            <Box sx={{ ...borderStyles, display: 'flex', flexDirection: 'column', mt: 0, mb: 2}}>
              <Tooltip title={`Open ${item.itemtype} in ${item.server.name}`}>
                <Button variant="outlined" href="#outlined-buttons" color="success" onClick={() => {openUrl(item)}}>
                  Already exists
                </Button>
              </Tooltip>
            </Box>
          ):(
            <ItemAdd item={item} />
          )}
        </Card>
      )}
    </ThemeProvider>
  );
}

