"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui/components/accordion";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { AspectRatio } from "@repo/ui/components/aspect-ratio";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@repo/ui/components/breadcrumb";
import { Button } from "@repo/ui/components/button";
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from "@repo/ui/components/button-group";
import { Calendar } from "@repo/ui/components/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@repo/ui/components/carousel";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@repo/ui/components/chart";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@repo/ui/components/combobox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@repo/ui/components/command";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@repo/ui/components/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@repo/ui/components/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Input } from "@repo/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@repo/ui/components/input-group";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@repo/ui/components/input-otp";
import { Label } from "@repo/ui/components/label";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@repo/ui/components/menubar";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@repo/ui/components/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@repo/ui/components/progress";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@repo/ui/components/resizable";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Separator } from "@repo/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui/components/sheet";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Slider } from "@repo/ui/components/slider";
import { Switch } from "@repo/ui/components/switch";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/tabs";
import { Textarea } from "@repo/ui/components/textarea";
import { Toggle } from "@repo/ui/components/toggle";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { type NeoColor, neoColors, type Theme } from "@repo/ui/lib/themes";
import {
  AlertCircle,
  ArrowRight,
  Bold,
  Calculator,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Copy,
  CreditCard,
  DollarSign,
  Home,
  Info,
  Italic,
  LogOut,
  Mail,
  Search,
  Settings,
  Smile,
  Terminal,
  Underline,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
} from "recharts";

const themes: { value: Theme; label: string; description: string }[] = [
  {
    value: "default",
    label: "Portfolio",
    description: "This site's own theme",
  },
  {
    value: "neobrutalist",
    label: "Neobrutalist",
    description: "Bold borders, shadows, and colors",
  },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <Separator />
      {children}
    </section>
  );
}

function Subsection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

export default function UIPage() {
  const [theme, setTheme] = useState<Theme>("default");
  const [neoColor, setNeoColor] = useState<NeoColor>("blue");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sliderValue, setSliderValue] = useState([50]);
  const [progressValue] = useState(65);
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(
    new Date(),
  );
  const [collapsibleOpen, setCollapsibleOpen] = useState(false);
  const [otpValue, setOtpValue] = useState("");

  // Set the theme on <html> so portal content (dialogs, popovers, etc.) is themed too. "Default"
  // is the site's own theme (data-theme="portfolio" from the layout), put back when this page
  // switches away or unmounts.
  const siteTheme = useRef<string | undefined>(undefined);
  useEffect(() => {
    const root = document.documentElement;
    siteTheme.current ??= root.dataset["theme"];
    const restore = () => {
      const own = siteTheme.current;
      if (own) root.dataset["theme"] = own;
      else delete root.dataset["theme"];
      delete root.dataset["neo"];
    };

    restore();
    if (theme === "neobrutalist") {
      root.dataset["theme"] = "neobrutalist";
      root.dataset["neo"] = neoColor;
    }
    return restore;
  }, [theme, neoColor]);

  const currentTheme = themes.find((t) => t.value === theme);

  const buttonVariants = [
    "default",
    "secondary",
    "outline",
    "ghost",
    "destructive",
    "link",
  ] as const;

  const badgeVariants = [
    "default",
    "secondary",
    "outline",
    "destructive",
    "ghost",
  ] as const;

  return (
    <main className="container mx-auto max-w-5xl px-4 py-12 space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">UI Components</h1>
            <p className="text-muted-foreground text-lg">
              Component library from <code className="text-sm">@repo/ui</code>
            </p>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted transition-colors min-w-[180px] justify-between"
              >
                <div className="flex flex-col items-start">
                  <span>{currentTheme?.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {currentTheme?.description}
                  </span>
                </div>
                <ChevronDown
                  className={`size-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 min-w-[220px] rounded-lg border border-border bg-card shadow-lg">
                  {themes.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => {
                        setTheme(t.value);
                        setDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        theme === t.value ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{t.label}</span>
                        {theme === t.value && (
                          <Check className="size-4 text-primary" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t.description}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Color Picker - Only for Neobrutalist */}
            {theme === "neobrutalist" && (
              <Popover>
                <PopoverTrigger render={<Button variant="outline" />}>
                  <div
                    className="size-5 rounded-full border border-border bg-(--swatch)"
                    style={
                      {
                        "--swatch": `var(--neo-preview-${neoColor})`,
                      } as React.CSSProperties
                    }
                  />
                  <span className="capitalize">{neoColor}</span>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Theme Color</p>
                    <div className="grid grid-cols-6 gap-2">
                      {neoColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNeoColor(color)}
                          className={`size-8 rounded-full border-2 bg-(--swatch) transition-all hover:scale-110 ${
                            neoColor === color
                              ? "border-foreground ring-2 ring-foreground ring-offset-2"
                              : "border-transparent"
                          }`}
                          style={
                            {
                              "--swatch": `var(--neo-preview-${color})`,
                            } as React.CSSProperties
                          }
                          title={color}
                        >
                          <span className="sr-only">{color}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>

      {/* Accordion */}
      <Section title="Accordion">
        <Accordion className="w-full max-w-md">
          <AccordionItem value="item-1">
            <AccordionTrigger>Is it accessible?</AccordionTrigger>
            <AccordionContent>
              Yes. It adheres to the WAI-ARIA design pattern.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Is it styled?</AccordionTrigger>
            <AccordionContent>
              Yes. It comes with default styles that match the other components.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Is it animated?</AccordionTrigger>
            <AccordionContent>
              Yes. It&apos;s animated by default, but you can disable it.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Section>

      {/* Alert */}
      <Section title="Alert">
        <div className="max-w-2xl space-y-4">
          <Alert>
            <Terminal className="size-4" />
            <AlertTitle>Heads up!</AlertTitle>
            <AlertDescription>
              You can add components to your app using the CLI.
            </AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Your session has expired. Please log in again.
            </AlertDescription>
          </Alert>
        </div>
      </Section>

      {/* Aspect Ratio */}
      <Section title="Aspect Ratio">
        <div className="w-[300px]">
          <div className="bg-muted overflow-hidden rounded-lg">
            <AspectRatio ratio={16 / 9}>
              <div className="flex h-full items-center justify-center text-muted-foreground">
                16:9
              </div>
            </AspectRatio>
          </div>
        </div>
      </Section>

      {/* Avatar */}
      <Section title="Avatar">
        <div className="flex items-center gap-6">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <AvatarGroup>
            <Avatar>
              <AvatarFallback>A</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>B</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>C</AvatarFallback>
            </Avatar>
          </AvatarGroup>
        </div>
      </Section>

      {/* Badge */}
      <Section title="Badge">
        <div className="flex flex-wrap gap-3">
          {badgeVariants.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant.charAt(0).toUpperCase() + variant.slice(1)}
            </Badge>
          ))}
        </div>
      </Section>

      {/* Breadcrumb */}
      <Section title="Breadcrumb">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">
                <Home className="size-4" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/components">Components</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Section>

      {/* Button */}
      <Section title="Button">
        <Subsection title="Variants">
          <div className="flex flex-wrap gap-3">
            {buttonVariants.map((variant) => (
              <Button key={variant} variant={variant}>
                {variant.charAt(0).toUpperCase() + variant.slice(1)}
              </Button>
            ))}
          </div>
        </Subsection>

        <Subsection title="Sizes">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="xs">Extra Small</Button>
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </div>
        </Subsection>

        <Subsection title="With Icons">
          <div className="flex flex-wrap gap-3">
            <Button>
              <Mail /> Send Email
            </Button>
            <Button variant="outline">
              Continue <ArrowRight />
            </Button>
          </div>
        </Subsection>
      </Section>

      {/* Button Group */}
      <Section title="Button Group">
        <Subsection title="Basic">
          <ButtonGroup>
            <Button variant="outline">Button 1</Button>
            <Button variant="outline">Button 2</Button>
            <Button variant="outline">Button 3</Button>
          </ButtonGroup>
        </Subsection>

        <Subsection title="Vertical">
          <ButtonGroup orientation="vertical">
            <Button variant="outline">Top</Button>
            <Button variant="outline">Middle</Button>
            <Button variant="outline">Bottom</Button>
          </ButtonGroup>
        </Subsection>

        <Subsection title="With Separator">
          <ButtonGroup>
            <Button>Save</Button>
            <ButtonGroupSeparator />
            <Button>
              <ChevronDown className="size-4" />
            </Button>
          </ButtonGroup>
        </Subsection>

        <Subsection title="Sizes">
          <div className="flex flex-wrap items-center gap-4">
            <ButtonGroup>
              <Button variant="outline" size="sm">
                Small
              </Button>
              <Button variant="outline" size="sm">
                Group
              </Button>
            </ButtonGroup>
            <ButtonGroup>
              <Button variant="outline">Default</Button>
              <Button variant="outline">Group</Button>
            </ButtonGroup>
            <ButtonGroup>
              <Button variant="outline" size="lg">
                Large
              </Button>
              <Button variant="outline" size="lg">
                Group
              </Button>
            </ButtonGroup>
          </div>
        </Subsection>
      </Section>

      {/* Calendar */}
      <Section title="Calendar">
        <div className="w-fit rounded-md border">
          <Calendar
            mode="single"
            selected={calendarDate}
            onSelect={setCalendarDate}
          />
        </div>
      </Section>

      {/* Card */}
      <Section title="Card">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>
                Card description with additional context.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This is the card content area.
              </p>
            </CardContent>
            <CardFooter>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Cancel
                </Button>
                <Button size="sm">Continue</Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </Section>

      {/* Chart */}
      <Section title="Chart">
        <Subsection title="Bar Chart">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Monthly Revenue</CardTitle>
              <CardDescription>January - June 2024</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  desktop: { label: "Desktop", color: "var(--primary)" },
                  mobile: { label: "Mobile", color: "var(--chart-2)" },
                }}
                className="min-h-[200px] w-full"
              >
                <BarChart
                  data={[
                    { month: "Jan", desktop: 186, mobile: 80 },
                    { month: "Feb", desktop: 305, mobile: 200 },
                    { month: "Mar", desktop: 237, mobile: 120 },
                    { month: "Apr", desktop: 73, mobile: 190 },
                    { month: "May", desktop: 209, mobile: 130 },
                    { month: "Jun", desktop: 214, mobile: 140 },
                  ]}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="desktop"
                    fill="var(--color-desktop)"
                    radius={4}
                  />
                  <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </Subsection>

        <Subsection title="Line Chart">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>Weekly active users</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  users: { label: "Users", color: "var(--primary)" },
                }}
                className="min-h-[200px] w-full"
              >
                <LineChart
                  data={[
                    { week: "W1", users: 400 },
                    { week: "W2", users: 300 },
                    { week: "W3", users: 520 },
                    { week: "W4", users: 480 },
                    { week: "W5", users: 600 },
                    { week: "W6", users: 750 },
                  ]}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="var(--color-users)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </Subsection>

        <Subsection title="Area Chart">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Page Views</CardTitle>
              <CardDescription>Daily traffic overview</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  views: { label: "Views", color: "var(--primary)" },
                }}
                className="min-h-[200px] w-full"
              >
                <AreaChart
                  data={[
                    { day: "Mon", views: 1200 },
                    { day: "Tue", views: 1800 },
                    { day: "Wed", views: 1400 },
                    { day: "Thu", views: 2200 },
                    { day: "Fri", views: 1900 },
                    { day: "Sat", views: 800 },
                    { day: "Sun", views: 600 },
                  ]}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="views"
                    fill="var(--color-views)"
                    fillOpacity={0.3}
                    stroke="var(--color-views)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </Subsection>

        <Subsection title="Pie Chart">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Browser Share</CardTitle>
              <CardDescription>Visitor browser distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  chrome: { label: "Chrome", color: "var(--chart-1)" },
                  firefox: { label: "Firefox", color: "var(--chart-2)" },
                  safari: { label: "Safari", color: "var(--chart-3)" },
                  edge: { label: "Edge", color: "var(--chart-4)" },
                  other: { label: "Other", color: "var(--chart-5)" },
                }}
                className="min-h-[200px] w-full"
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={[
                      {
                        browser: "chrome",
                        visitors: 275,
                        fill: "var(--color-chrome)",
                      },
                      {
                        browser: "firefox",
                        visitors: 150,
                        fill: "var(--color-firefox)",
                      },
                      {
                        browser: "safari",
                        visitors: 200,
                        fill: "var(--color-safari)",
                      },
                      {
                        browser: "edge",
                        visitors: 100,
                        fill: "var(--color-edge)",
                      },
                      {
                        browser: "other",
                        visitors: 75,
                        fill: "var(--color-other)",
                      },
                    ]}
                    dataKey="visitors"
                    nameKey="browser"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                  />
                  <ChartLegend
                    content={<ChartLegendContent nameKey="browser" />}
                  />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </Subsection>
      </Section>

      {/* Carousel */}
      <Section title="Carousel">
        <div className="mx-auto w-full max-w-xs">
          <Carousel className="w-full">
            <CarouselContent>
              {[1, 2, 3, 4, 5].map((slide) => (
                <CarouselItem key={slide}>
                  <div className="p-1">
                    <Card>
                      <CardContent className="flex aspect-square items-center justify-center">
                        <span className="text-4xl font-semibold">{slide}</span>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </Section>

      {/* Checkbox */}
      <Section title="Checkbox">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox id="terms" />
            <Label htmlFor="terms">Accept terms and conditions</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="newsletter" defaultChecked />
            <Label htmlFor="newsletter">Subscribe to newsletter</Label>
          </div>
        </div>
      </Section>

      {/* Combobox */}
      <Section title="Combobox">
        <div className="w-[250px]">
          <Combobox>
            <ComboboxInput placeholder="Select framework..." />
            <ComboboxContent>
              <ComboboxList>
                <ComboboxEmpty>No framework found.</ComboboxEmpty>
                <ComboboxItem value="next">Next.js</ComboboxItem>
                <ComboboxItem value="remix">Remix</ComboboxItem>
                <ComboboxItem value="astro">Astro</ComboboxItem>
                <ComboboxItem value="nuxt">Nuxt</ComboboxItem>
                <ComboboxItem value="sveltekit">SvelteKit</ComboboxItem>
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
      </Section>

      {/* Collapsible */}
      <Section title="Collapsible">
        <Collapsible
          open={collapsibleOpen}
          onOpenChange={setCollapsibleOpen}
          className="w-[350px]"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between space-x-4 px-4">
              <h4 className="text-sm font-semibold">
                @peduarte starred 3 repositories
              </h4>
              <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
                <ChevronsUpDown className="size-4" />
                <span className="sr-only">Toggle</span>
              </CollapsibleTrigger>
            </div>
            <div className="rounded-md border px-4 py-2 font-mono text-sm shadow-sm">
              @radix-ui/primitives
            </div>
            <CollapsibleContent>
              <div className="flex flex-col gap-2">
                <div className="rounded-md border px-4 py-2 font-mono text-sm shadow-sm">
                  @radix-ui/colors
                </div>
                <div className="rounded-md border px-4 py-2 font-mono text-sm shadow-sm">
                  @stitches/react
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </Section>

      {/* Command */}
      <Section title="Command">
        <div className="max-w-md overflow-hidden rounded-lg border shadow-md">
          <Command>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Suggestions">
                <CommandItem>
                  <Calculator className="mr-2 size-4" />
                  <span>Calculator</span>
                </CommandItem>
                <CommandItem>
                  <Smile className="mr-2 size-4" />
                  <span>Search Emoji</span>
                </CommandItem>
                <CommandItem>
                  <Calculator className="mr-2 size-4" />
                  <span>Calculator</span>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Settings">
                <CommandItem>
                  <User className="mr-2 size-4" />
                  <span>Profile</span>
                </CommandItem>
                <CommandItem>
                  <CreditCard className="mr-2 size-4" />
                  <span>Billing</span>
                </CommandItem>
                <CommandItem>
                  <Settings className="mr-2 size-4" />
                  <span>Settings</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </Section>

      {/* Context Menu */}
      <Section title="Context Menu">
        <ContextMenu>
          <ContextMenuTrigger className="flex h-32 w-64">
            <div className="flex size-full items-center justify-center rounded-md border border-dashed text-sm">
              Right click here
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-64">
            <ContextMenuItem>
              <Copy className="mr-2 size-4" />
              Copy
            </ContextMenuItem>
            <ContextMenuItem>
              <User className="mr-2 size-4" />
              Profile
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem>
              <Settings className="mr-2 size-4" />
              Settings
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </Section>

      {/* Dialog */}
      <Section title="Dialog">
        <Dialog>
          <DialogTrigger render={<Button />}>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog Title</DialogTitle>
              <DialogDescription>
                This is a dialog description. It provides context about the
                dialog content.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Dialog content goes here.
              </p>
            </div>
            <DialogFooter>
              <Button size="sm">Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      {/* Drawer */}
      <Section title="Drawer">
        <Drawer>
          <DrawerTrigger render={<Button />}>Open Drawer</DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Drawer Title</DrawerTitle>
              <DrawerDescription>
                This is a drawer description.
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4">
              <p className="text-sm text-muted-foreground">
                Drawer content goes here.
              </p>
            </div>
            <DrawerFooter>
              <Button>Submit</Button>
              <DrawerClose render={<Button variant="outline" />}>
                Cancel
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </Section>

      {/* Dropdown Menu */}
      <Section title="Dropdown Menu">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button />}>
            Open Menu
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuItem>
                <User className="mr-2 size-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard className="mr-2 size-4" />
                <span>Billing</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 size-4" />
                <span>Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <LogOut className="mr-2 size-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </Section>

      {/* Input */}
      <Section title="Input">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="Enter your email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="disabled">Disabled</Label>
            <Input id="disabled" disabled placeholder="Disabled input" />
          </div>
        </div>
      </Section>

      {/* Input Group */}
      <Section title="Input Group">
        <div className="flex flex-col gap-4 max-w-sm">
          <InputGroup>
            <InputGroupAddon>
              <Search className="size-4" />
            </InputGroupAddon>
            <InputGroupInput placeholder="Search..." />
          </InputGroup>
          <InputGroup>
            <InputGroupAddon>
              <DollarSign className="size-4" />
            </InputGroupAddon>
            <InputGroupInput placeholder="0.00" type="number" />
            <InputGroupAddon align="inline-end">USD</InputGroupAddon>
          </InputGroup>
          <InputGroup>
            <InputGroupAddon>
              <Mail className="size-4" />
            </InputGroupAddon>
            <InputGroupInput placeholder="email" />
            <InputGroupAddon align="inline-end">@example.com</InputGroupAddon>
          </InputGroup>
        </div>
      </Section>

      {/* Input OTP */}
      <Section title="Input OTP">
        <div className="space-y-2">
          <Label>One-Time Password</Label>
          <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          <p className="text-sm text-muted-foreground">
            Value: {otpValue || "(empty)"}
          </p>
        </div>
      </Section>

      {/* Label */}
      <Section title="Label">
        <div className="flex flex-wrap gap-4">
          <Label>Default Label</Label>
          <Label>
            <span className="text-muted-foreground">Muted Label</span>
          </Label>
        </div>
      </Section>

      {/* Menubar */}
      <Section title="Menubar">
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>New Tab</MenubarItem>
              <MenubarItem>New Window</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Share</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Print</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Undo</MenubarItem>
              <MenubarItem>Redo</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Cut</MenubarItem>
              <MenubarItem>Copy</MenubarItem>
              <MenubarItem>Paste</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Zoom In</MenubarItem>
              <MenubarItem>Zoom Out</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Full Screen</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </Section>

      {/* Pagination */}
      <Section title="Pagination">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                2
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">3</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </Section>

      {/* Popover */}
      <Section title="Popover">
        <Popover>
          <PopoverTrigger render={<Button />}>Open Popover</PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Dimensions</h4>
                <p className="text-sm text-muted-foreground">
                  Set the dimensions for the layer.
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </Section>

      {/* Progress */}
      <Section title="Progress">
        <div className="max-w-md space-y-6">
          <Subsection title="Basic">
            <Progress value={progressValue} />
          </Subsection>

          <Subsection title="With Label">
            <Progress value={progressValue} className="w-full">
              <ProgressLabel>Upload progress</ProgressLabel>
              <ProgressValue />
            </Progress>
          </Subsection>
        </div>
      </Section>

      {/* Radio Group */}
      <Section title="Radio Group">
        <RadioGroup defaultValue="option-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option-1" id="option-1" />
            <Label htmlFor="option-1">Option One</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option-2" id="option-2" />
            <Label htmlFor="option-2">Option Two</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option-3" id="option-3" />
            <Label htmlFor="option-3">Option Three</Label>
          </div>
        </RadioGroup>
      </Section>

      {/* Resizable */}
      <Section title="Resizable">
        <div className="max-w-md overflow-hidden rounded-lg border">
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel defaultSize={50}>
              <div className="flex h-32 items-center justify-center p-6">
                <span className="font-semibold">Panel One</span>
              </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={50}>
              <div className="flex h-32 items-center justify-center p-6">
                <span className="font-semibold">Panel Two</span>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </Section>

      {/* Scroll Area */}
      <Section title="Scroll Area">
        <div className="w-48 overflow-hidden rounded-md border">
          <ScrollArea className="h-48">
            <div className="space-y-4 p-4">
              {Array.from({ length: 20 }, (_, i) => i + 1).map((item) => (
                <div key={item} className="text-sm">
                  Item {item}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </Section>

      {/* Select */}
      <Section title="Select">
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="blueberry">Blueberry</SelectItem>
            <SelectItem value="grapes">Grapes</SelectItem>
            <SelectItem value="pineapple">Pineapple</SelectItem>
          </SelectContent>
        </Select>
      </Section>

      {/* Separator */}
      <Section title="Separator">
        <div className="max-w-md space-y-4">
          <p className="text-sm">Above the separator</p>
          <Separator />
          <p className="text-sm">Below the separator</p>
          <div className="flex h-6 items-center gap-4">
            <span className="text-sm">Item 1</span>
            <Separator orientation="vertical" />
            <span className="text-sm">Item 2</span>
            <Separator orientation="vertical" />
            <span className="text-sm">Item 3</span>
          </div>
        </div>
      </Section>

      {/* Sheet */}
      <Section title="Sheet">
        <Sheet>
          <SheetTrigger render={<Button />}>Open Sheet</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Sheet Title</SheetTitle>
              <SheetDescription>
                This is a sheet that slides in from the side.
              </SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Sheet content goes here.
              </p>
            </div>
          </SheetContent>
        </Sheet>
      </Section>

      {/* Skeleton */}
      <Section title="Skeleton">
        <div className="flex items-center space-x-4">
          <div className="size-12 overflow-hidden rounded-full">
            <Skeleton className="size-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </Section>

      {/* Slider */}
      <Section title="Slider">
        <div className="max-w-md space-y-4">
          <Slider
            value={sliderValue}
            onValueChange={(val) =>
              setSliderValue(Array.isArray(val) ? [...val] : [val])
            }
            max={100}
            step={1}
          />
          <p className="text-sm text-muted-foreground">
            Value: {sliderValue[0]}
          </p>
        </div>
      </Section>

      {/* Switch */}
      <Section title="Switch">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch id="airplane" />
            <Label htmlFor="airplane">Airplane Mode</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="wifi" defaultChecked />
            <Label htmlFor="wifi">WiFi Enabled</Label>
          </div>
        </div>
      </Section>

      {/* Table */}
      <Section title="Table">
        <Table>
          <TableCaption>A list of recent invoices.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Invoice</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <span className="font-medium">INV001</span>
              </TableCell>
              <TableCell>Paid</TableCell>
              <TableCell>Credit Card</TableCell>
              <TableCell className="text-right">$250.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <span className="font-medium">INV002</span>
              </TableCell>
              <TableCell>Pending</TableCell>
              <TableCell>PayPal</TableCell>
              <TableCell className="text-right">$150.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <span className="font-medium">INV003</span>
              </TableCell>
              <TableCell>Unpaid</TableCell>
              <TableCell>Bank Transfer</TableCell>
              <TableCell className="text-right">$350.00</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      {/* Tabs */}
      <Section title="Tabs">
        <Tabs defaultValue="account" className="w-full max-w-md">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="account">
            <div className="p-4">Account settings content.</div>
          </TabsContent>
          <TabsContent value="password">
            <div className="p-4">Password settings content.</div>
          </TabsContent>
          <TabsContent value="settings">
            <div className="p-4">General settings content.</div>
          </TabsContent>
        </Tabs>
      </Section>

      {/* Textarea */}
      <Section title="Textarea">
        <div className="max-w-md space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea id="message" placeholder="Type your message here..." />
        </div>
      </Section>

      {/* Toggle */}
      <Section title="Toggle">
        <div className="flex flex-wrap gap-4">
          <Toggle aria-label="Toggle italic">
            <Bold className="size-4" />
          </Toggle>
          <Toggle variant="outline" aria-label="Toggle italic">
            <Italic className="size-4" />
          </Toggle>
          <Toggle disabled aria-label="Toggle underline">
            <Underline className="size-4" />
          </Toggle>
        </div>
      </Section>

      {/* Toggle Group */}
      <Section title="Toggle Group">
        <ToggleGroup>
          <ToggleGroupItem value="bold" aria-label="Toggle bold">
            <Bold className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Toggle italic">
            <Italic className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Toggle underline">
            <Underline className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </Section>

      {/* Tooltip */}
      <Section title="Tooltip">
        <div className="flex gap-4">
          <Tooltip>
            <TooltipTrigger render={<Button />}>
              <Info className="size-4" />
              Hover me
            </TooltipTrigger>
            <TooltipContent>
              <p>This is a tooltip!</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </Section>
    </main>
  );
}
