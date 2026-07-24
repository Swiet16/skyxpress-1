// @ts-nocheck
import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Country {
  id: string;
  name: string;
  code: string;
}

interface CountrySelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const CountrySelect = ({ value, onValueChange, placeholder = "Select country...", className }: CountrySelectProps) => {
  const [open, setOpen] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      // Try to load from database first
      const { data, error } = await supabase
        .from('countries_list')
        .select('*')
        .order('name', { ascending: true });

      if (data && data.length > 0) {
        setCountries(data);
      } else {
        // Fallback to hardcoded list if database is empty
        console.log('Using fallback country list');
        loadFallbackCountries();
      }
    } catch (error) {
      console.error('Error loading countries:', error);
      loadFallbackCountries();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackCountries = () => {
    // Fallback list with 190+ countries
    const fallbackCountries: Country[] = [
      { id: '1', name: 'Afghanistan', code: 'AF' },
      { id: '2', name: 'Albania', code: 'AL' },
      { id: '3', name: 'Algeria', code: 'DZ' },
      { id: '4', name: 'Andorra', code: 'AD' },
      { id: '5', name: 'Angola', code: 'AO' },
      { id: '6', name: 'Antigua and Barbuda', code: 'AG' },
      { id: '7', name: 'Argentina', code: 'AR' },
      { id: '8', name: 'Armenia', code: 'AM' },
      { id: '9', name: 'Australia', code: 'AU' },
      { id: '10', name: 'Austria', code: 'AT' },
      { id: '11', name: 'Azerbaijan', code: 'AZ' },
      { id: '12', name: 'Bahamas', code: 'BS' },
      { id: '13', name: 'Bahrain', code: 'BH' },
      { id: '14', name: 'Bangladesh', code: 'BD' },
      { id: '15', name: 'Barbados', code: 'BB' },
      { id: '16', name: 'Belarus', code: 'BY' },
      { id: '17', name: 'Belgium', code: 'BE' },
      { id: '18', name: 'Belize', code: 'BZ' },
      { id: '19', name: 'Benin', code: 'BJ' },
      { id: '20', name: 'Bhutan', code: 'BT' },
      { id: '21', name: 'Bolivia', code: 'BO' },
      { id: '22', name: 'Bosnia and Herzegovina', code: 'BA' },
      { id: '23', name: 'Botswana', code: 'BW' },
      { id: '24', name: 'Brazil', code: 'BR' },
      { id: '25', name: 'Brunei', code: 'BN' },
      { id: '26', name: 'Bulgaria', code: 'BG' },
      { id: '27', name: 'Burkina Faso', code: 'BF' },
      { id: '28', name: 'Burundi', code: 'BI' },
      { id: '29', name: 'Cambodia', code: 'KH' },
      { id: '30', name: 'Cameroon', code: 'CM' },
      { id: '31', name: 'Canada', code: 'CA' },
      { id: '32', name: 'Cape Verde', code: 'CV' },
      { id: '33', name: 'Central African Republic', code: 'CF' },
      { id: '34', name: 'Chad', code: 'TD' },
      { id: '35', name: 'Chile', code: 'CL' },
      { id: '36', name: 'China', code: 'CN' },
      { id: '37', name: 'Colombia', code: 'CO' },
      { id: '38', name: 'Comoros', code: 'KM' },
      { id: '39', name: 'Congo', code: 'CG' },
      { id: '40', name: 'Costa Rica', code: 'CR' },
      { id: '41', name: 'Croatia', code: 'HR' },
      { id: '42', name: 'Cuba', code: 'CU' },
      { id: '43', name: 'Cyprus', code: 'CY' },
      { id: '44', name: 'Czech Republic', code: 'CZ' },
      { id: '45', name: 'Denmark', code: 'DK' },
      { id: '46', name: 'Djibouti', code: 'DJ' },
      { id: '47', name: 'Dominica', code: 'DM' },
      { id: '48', name: 'Dominican Republic', code: 'DO' },
      { id: '49', name: 'Ecuador', code: 'EC' },
      { id: '50', name: 'Egypt', code: 'EG' },
      { id: '51', name: 'El Salvador', code: 'SV' },
      { id: '52', name: 'Equatorial Guinea', code: 'GQ' },
      { id: '53', name: 'Eritrea', code: 'ER' },
      { id: '54', name: 'Estonia', code: 'EE' },
      { id: '55', name: 'Ethiopia', code: 'ET' },
      { id: '56', name: 'Fiji', code: 'FJ' },
      { id: '57', name: 'Finland', code: 'FI' },
      { id: '58', name: 'France', code: 'FR' },
      { id: '59', name: 'Gabon', code: 'GA' },
      { id: '60', name: 'Gambia', code: 'GM' },
      { id: '61', name: 'Georgia', code: 'GE' },
      { id: '62', name: 'Germany', code: 'DE' },
      { id: '63', name: 'Ghana', code: 'GH' },
      { id: '64', name: 'Greece', code: 'GR' },
      { id: '65', name: 'Grenada', code: 'GD' },
      { id: '66', name: 'Guatemala', code: 'GT' },
      { id: '67', name: 'Guinea', code: 'GN' },
      { id: '68', name: 'Guinea-Bissau', code: 'GW' },
      { id: '69', name: 'Guyana', code: 'GY' },
      { id: '70', name: 'Haiti', code: 'HT' },
      { id: '71', name: 'Honduras', code: 'HN' },
      { id: '72', name: 'Hungary', code: 'HU' },
      { id: '73', name: 'Iceland', code: 'IS' },
      { id: '74', name: 'India', code: 'IN' },
      { id: '75', name: 'Indonesia', code: 'ID' },
      { id: '76', name: 'Iran', code: 'IR' },
      { id: '77', name: 'Iraq', code: 'IQ' },
      { id: '78', name: 'Ireland', code: 'IE' },
      { id: '79', name: 'Israel', code: 'IL' },
      { id: '80', name: 'Italy', code: 'IT' },
      { id: '81', name: 'Jamaica', code: 'JM' },
      { id: '82', name: 'Japan', code: 'JP' },
      { id: '83', name: 'Jordan', code: 'JO' },
      { id: '84', name: 'Kazakhstan', code: 'KZ' },
      { id: '85', name: 'Kenya', code: 'KE' },
      { id: '86', name: 'Kiribati', code: 'KI' },
      { id: '87', name: 'Kuwait', code: 'KW' },
      { id: '88', name: 'Kyrgyzstan', code: 'KG' },
      { id: '89', name: 'Laos', code: 'LA' },
      { id: '90', name: 'Latvia', code: 'LV' },
      { id: '91', name: 'Lebanon', code: 'LB' },
      { id: '92', name: 'Lesotho', code: 'LS' },
      { id: '93', name: 'Liberia', code: 'LR' },
      { id: '94', name: 'Libya', code: 'LY' },
      { id: '95', name: 'Liechtenstein', code: 'LI' },
      { id: '96', name: 'Lithuania', code: 'LT' },
      { id: '97', name: 'Luxembourg', code: 'LU' },
      { id: '98', name: 'Madagascar', code: 'MG' },
      { id: '99', name: 'Malawi', code: 'MW' },
      { id: '100', name: 'Malaysia', code: 'MY' },
      { id: '101', name: 'Maldives', code: 'MV' },
      { id: '102', name: 'Mali', code: 'ML' },
      { id: '103', name: 'Malta', code: 'MT' },
      { id: '104', name: 'Marshall Islands', code: 'MH' },
      { id: '105', name: 'Mauritania', code: 'MR' },
      { id: '106', name: 'Mauritius', code: 'MU' },
      { id: '107', name: 'Mexico', code: 'MX' },
      { id: '108', name: 'Micronesia', code: 'FM' },
      { id: '109', name: 'Moldova', code: 'MD' },
      { id: '110', name: 'Monaco', code: 'MC' },
      { id: '111', name: 'Mongolia', code: 'MN' },
      { id: '112', name: 'Montenegro', code: 'ME' },
      { id: '113', name: 'Morocco', code: 'MA' },
      { id: '114', name: 'Mozambique', code: 'MZ' },
      { id: '115', name: 'Myanmar', code: 'MM' },
      { id: '116', name: 'Namibia', code: 'NA' },
      { id: '117', name: 'Nauru', code: 'NR' },
      { id: '118', name: 'Nepal', code: 'NP' },
      { id: '119', name: 'Netherlands', code: 'NL' },
      { id: '120', name: 'New Zealand', code: 'NZ' },
      { id: '121', name: 'Nicaragua', code: 'NI' },
      { id: '122', name: 'Niger', code: 'NE' },
      { id: '123', name: 'Nigeria', code: 'NG' },
      { id: '124', name: 'North Korea', code: 'KP' },
      { id: '125', name: 'North Macedonia', code: 'MK' },
      { id: '126', name: 'Norway', code: 'NO' },
      { id: '127', name: 'Oman', code: 'OM' },
      { id: '128', name: 'Pakistan', code: 'PK' },
      { id: '129', name: 'Palau', code: 'PW' },
      { id: '130', name: 'Palestine', code: 'PS' },
      { id: '131', name: 'Panama', code: 'PA' },
      { id: '132', name: 'Papua New Guinea', code: 'PG' },
      { id: '133', name: 'Paraguay', code: 'PY' },
      { id: '134', name: 'Peru', code: 'PE' },
      { id: '135', name: 'Philippines', code: 'PH' },
      { id: '136', name: 'Poland', code: 'PL' },
      { id: '137', name: 'Portugal', code: 'PT' },
      { id: '138', name: 'Qatar', code: 'QA' },
      { id: '139', name: 'Romania', code: 'RO' },
      { id: '140', name: 'Russia', code: 'RU' },
      { id: '141', name: 'Rwanda', code: 'RW' },
      { id: '142', name: 'Saint Kitts and Nevis', code: 'KN' },
      { id: '143', name: 'Saint Lucia', code: 'LC' },
      { id: '144', name: 'Saint Vincent and the Grenadines', code: 'VC' },
      { id: '145', name: 'Samoa', code: 'WS' },
      { id: '146', name: 'San Marino', code: 'SM' },
      { id: '147', name: 'Sao Tome and Principe', code: 'ST' },
      { id: '148', name: 'Saudi Arabia', code: 'SA' },
      { id: '149', name: 'Senegal', code: 'SN' },
      { id: '150', name: 'Serbia', code: 'RS' },
      { id: '151', name: 'Seychelles', code: 'SC' },
      { id: '152', name: 'Sierra Leone', code: 'SL' },
      { id: '153', name: 'Singapore', code: 'SG' },
      { id: '154', name: 'Slovakia', code: 'SK' },
      { id: '155', name: 'Slovenia', code: 'SI' },
      { id: '156', name: 'Solomon Islands', code: 'SB' },
      { id: '157', name: 'Somalia', code: 'SO' },
      { id: '158', name: 'South Africa', code: 'ZA' },
      { id: '159', name: 'South Korea', code: 'KR' },
      { id: '160', name: 'South Sudan', code: 'SS' },
      { id: '161', name: 'Spain', code: 'ES' },
      { id: '162', name: 'Sri Lanka', code: 'LK' },
      { id: '163', name: 'Sudan', code: 'SD' },
      { id: '164', name: 'Suriname', code: 'SR' },
      { id: '165', name: 'Sweden', code: 'SE' },
      { id: '166', name: 'Switzerland', code: 'CH' },
      { id: '167', name: 'Syria', code: 'SY' },
      { id: '168', name: 'Taiwan', code: 'TW' },
      { id: '169', name: 'Tajikistan', code: 'TJ' },
      { id: '170', name: 'Tanzania', code: 'TZ' },
      { id: '171', name: 'Thailand', code: 'TH' },
      { id: '172', name: 'Timor-Leste', code: 'TL' },
      { id: '173', name: 'Togo', code: 'TG' },
      { id: '174', name: 'Tonga', code: 'TO' },
      { id: '175', name: 'Trinidad and Tobago', code: 'TT' },
      { id: '176', name: 'Tunisia', code: 'TN' },
      { id: '177', name: 'Turkey', code: 'TR' },
      { id: '178', name: 'Turkmenistan', code: 'TM' },
      { id: '179', name: 'Tuvalu', code: 'TV' },
      { id: '180', name: 'Uganda', code: 'UG' },
      { id: '181', name: 'Ukraine', code: 'UA' },
      { id: '182', name: 'United Arab Emirates', code: 'AE' },
      { id: '183', name: 'United Kingdom', code: 'GB' },
      { id: '184', name: 'United States', code: 'US' },
      { id: '185', name: 'Uruguay', code: 'UY' },
      { id: '186', name: 'Uzbekistan', code: 'UZ' },
      { id: '187', name: 'Vanuatu', code: 'VU' },
      { id: '188', name: 'Vatican City', code: 'VA' },
      { id: '189', name: 'Venezuela', code: 'VE' },
      { id: '190', name: 'Vietnam', code: 'VN' },
      { id: '191', name: 'Yemen', code: 'YE' },
      { id: '192', name: 'Zambia', code: 'ZM' },
      { id: '193', name: 'Zimbabwe', code: 'ZW' }
    ];
    setCountries(fallbackCountries);
  };

  const selectedCountry = countries.find(country => country.name === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedCountry ? selectedCountry.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 z-50" style={{ minWidth: '300px' }}>
        <Command>
          <CommandInput 
            placeholder="Search countries..." 
            className="border-0 focus:ring-0"
          />
          <CommandList className="max-h-60 overflow-y-auto">
            <CommandEmpty>
              {loading ? "Loading countries..." : "No country found."}
            </CommandEmpty>
            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country.id}
                  value={country.name}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === country.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1">{country.name}</span>
                  <span className="text-muted-foreground text-sm">{country.code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};