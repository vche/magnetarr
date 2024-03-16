/* global chrome */

import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import { Server } from '../lib/server';
import './extension_settings.css';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function CustomTabPanel({ children, selected, name, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={selected !== name}
      id={`tabpanel-${name}`}
      aria-labelledby={`tab-${name}`}
      {...other}
    >
      {selected === name && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function tabProps(name) {
  return {
    id: `tab-${name}`,
    value: `${name}`,
    'aria-controls': `tabpanel-${name}`,
  };
}

function CliArrSettings( { name, default_port="0"} ) {
  const [server, setServer] = React.useState(null)
  const [invalidHost, setInvalidHost] = React.useState("")
  const [invalidPort, setInvalidPort] = React.useState("")
  const [invalidKey, setInvalidKey] = React.useState("")
  const [errorText, setErrorText] = React.useState("")
  const [successText, setSuccessText] = React.useState("")

  // Load config from settings for this server
  React.useEffect(() => {
    if (!server) {
      const new_server = new Server(name, default_port);
      new_server.loadConfig((items) => { setServer(new_server);});
    }
  }, [server])

  // Display a notification string
  function notify(setter, message) {
    setter(message)
    setTimeout(() => { setter(""); }, 2000);
  }

  // Validate the form, test config, and store the update
  function handleSubmit(event) {
      var validated = true;
      event.preventDefault();
      event.stopPropagation();

      if (!event.target.id_host.value.startsWith("http")) {
          setInvalidHost("Host must start with http or https"); validated = false
      }
      else {setInvalidHost(""); }
      if (isNaN(event.target.id_port.value)) {
          setInvalidPort("Port must be a number"); validated = false
      }
      else {setInvalidPort(""); }
      if (event.target.id_apikey.value.length < 3) {
        setInvalidKey("API Key cannot be empty"); validated = false
      }
      else {setInvalidKey(""); }

      if (validated){
        // Set the validated data
        server.host = event.target.id_host.value;
        server.port = event.target.id_port.value;
        server.apikey = event.target.id_apikey.value;
        server.user = event.target.id_user.value;
        server.password = event.target.id_pass.value;
        
        server.get("/api/v3/system/status").then(
          (data) => {
            console.log(`Detected ${data.appName} ${data.version}`);
            server.enabled = true;
            notify(setSuccessText, `${server.name} configuration verified, server enabled`);
          }
        ).catch(
          (error) => { 
            server.enabled = false;
            notify(setErrorText, `${server.name} configuration failed [${error}], server disabled`);
          }
        ).finally(
          () => { server.saveConfig(() => { console.log(`${server.name} configuration saved.`); }); }
        );
      }
   };

  return (
      <div>
          {server && (
            <form onSubmit={handleSubmit}>
                {server.enabled?(
                  <Chip icon={<CheckCircleOutlineIcon />}  label="Enabled" color="success" variant="outlined" />
                ):(
                  <Chip icon={<HighlightOffIcon />}  label="Disabled" color="error" variant="outlined" />
                )}
                <TextField id="id_host"
                    label="Host"
                    variant="outlined"
                    margin="normal" 
                    fullWidth
                    autoComplete="host"
                    error={invalidHost?true:false}
                    helperText={invalidHost}
                    defaultValue={server.host}
                    size="small"
                />
                <TextField id="id_port" 
                    label="Port"
                    variant="outlined"
                    margin="normal" 
                    fullWidth
                    autoComplete="port"
                    error={invalidPort?true:false}
                    helperText={invalidPort}
                    defaultValue={server.port}
                    size="small"
                />
                <TextField id="id_apikey" 
                    label="API key"
                    variant="outlined"
                    margin="normal" 
                    fullWidth
                    autoComplete="key"
                    error={invalidKey?true:false}
                    helperText={invalidKey}
                    defaultValue={server.apikey}
                    size="small"
                />

                <Typography variant="caption" display="block" gutterBottom>
                  Leave empty if no authentication
                </Typography>
                <Stack direction="row" spacing={1} sx={{ my: '10px' }}>
                  <TextField id="id_user" 
                      label="User"
                      variant="outlined"
                      margin="normal" 
                      fullWidth
                      autoComplete="username"
                      defaultValue={server.user}
                      size="small"
                  />
                  <TextField id="id_pass" 
                      label="Password"
                      variant="outlined"
                      margin="normal" 
                      type="password"
                      fullWidth
                      autoComplete="current-password"
                      defaultValue={server.password}
                      size="small"
                  />
                </Stack>

                <Button type="submit" >
                    Apply
                </Button>
                {errorText && (<Typography variant="caption" display="block" gutterBottom className="errorText">
                  {errorText}
                </Typography>)}
                {successText && (<Typography variant="caption" display="block" gutterBottom className="successText">
                  {successText}
                </Typography>)}
            </form>
        )}
      </div>
  )
}

export default function ExtensionSettings() {
  const [value, setValue] = React.useState("sonarr");

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={value} onChange={handleChange}>
            <Tab label="Sonarr" {...tabProps("sonarr")} />
            <Tab label="Radarr" {...tabProps("radarr")} />
          </Tabs>
        </Box>
        <CustomTabPanel selected={value} name="sonarr">
          <CliArrSettings name="sonarr" default_port="8989"/>
        </CustomTabPanel>
        <CustomTabPanel selected={value} name="radarr">
          <CliArrSettings name="radarr" default_port="7878"/>
        </CustomTabPanel>
      </Box>
    </ThemeProvider>
  );
}
